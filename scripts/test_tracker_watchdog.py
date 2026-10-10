"""Casos do guarda da porta 5433 em tracker-watchdog.py.

Rodar: python scripts/test_tracker_watchdog.py
Nenhum caso toca o Docker de verdade: porta, inspect e comandos sao trocados por dublês.
"""
import importlib.util
import json
import os
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPEC = importlib.util.spec_from_file_location("tracker_watchdog", os.path.join(ROOT, "tracker-watchdog.py"))
wd = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(wd)

NOW = 1_800_000_000.0
LONG_AGO = NOW - 3600


class FakeRun:
    def __init__(self):
        self.calls = []

    def __call__(self, args, timeout):
        self.calls.append(list(args[1:]))

        class R:
            returncode = 0
            stdout = ""

        return R()


class GuardBase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.saved = {k: getattr(wd, k) for k in ("STATE_FILE", "LOG_FILE", "port_open", "docker_exe", "container_state", "run")}
        wd.STATE_FILE = os.path.join(self.tmp.name, "state.json")
        wd.LOG_FILE = os.path.join(self.tmp.name, "autostart.log")
        wd.docker_exe = lambda: "docker"
        self.run = FakeRun()
        wd.run = self.run
        self.port = False
        wd.port_open = lambda *a, **k: self.port
        self.info = (True, LONG_AGO)
        wd.container_state = lambda docker: self.info

    def tearDown(self):
        for k, v in self.saved.items():
            setattr(wd, k, v)
        self.tmp.cleanup()

    def write_state(self, state):
        with open(wd.STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f)

    def read_state(self):
        with open(wd.STATE_FILE, encoding="utf-8") as f:
            return json.load(f)


class GuardTick(GuardBase):
    def test_open_port_does_nothing_and_clears_the_mark(self):
        self.port = True
        self.write_state({"closed_since": NOW - 500, "repairs": []})
        self.assertEqual(wd.guard_db_port(NOW), "open")
        self.assertIsNone(self.read_state()["closed_since"])
        self.assertEqual(self.run.calls, [])

    def test_docker_down_never_acts(self):
        self.info = None
        self.write_state({"closed_since": NOW - 500})
        self.assertEqual(wd.guard_db_port(NOW), "no-docker")
        self.assertIsNone(self.read_state()["closed_since"])
        self.assertEqual(self.run.calls, [])

    def test_first_closed_tick_only_marks(self):
        self.assertEqual(wd.guard_db_port(NOW), "first-seen")
        self.assertEqual(self.read_state()["closed_since"], NOW)
        self.assertEqual(self.run.calls, [])

    def test_closed_for_less_than_two_ticks_waits(self):
        self.write_state({"closed_since": NOW - 60})
        self.assertEqual(wd.guard_db_port(NOW), "waiting")
        self.assertEqual(self.run.calls, [])

    def test_the_0910_failure_running_container_closed_port_restarts(self):
        self.write_state({"closed_since": NOW - 200})
        self.assertEqual(wd.guard_db_port(NOW), "restart")
        self.assertEqual(self.run.calls, [["restart", wd.CONTAINER]])
        state = self.read_state()
        self.assertIsNone(state["closed_since"])
        self.assertEqual(state["repairs"], [NOW])

    def test_stopped_container_is_started_never_recreated(self):
        self.info = (False, LONG_AGO)
        self.write_state({"closed_since": NOW - 200})
        self.assertEqual(wd.guard_db_port(NOW), "start")
        self.assertEqual(self.run.calls, [["start", wd.CONTAINER]])

    def test_container_that_just_started_is_left_to_docker(self):
        self.info = (True, NOW - 60)
        self.write_state({"closed_since": NOW - 200})
        self.assertEqual(wd.guard_db_port(NOW), "settling")
        self.assertEqual(self.run.calls, [])

    def test_three_repairs_in_an_hour_stop_the_loop(self):
        self.write_state({"closed_since": NOW - 200, "repairs": [NOW - 3000, NOW - 2000, NOW - 1000]})
        self.assertEqual(wd.guard_db_port(NOW), "limit")
        self.assertEqual(self.run.calls, [])

    def test_repairs_older_than_an_hour_do_not_count(self):
        self.write_state({"closed_since": NOW - 200, "repairs": [NOW - 9000, NOW - 8000, NOW - 7000]})
        self.assertEqual(wd.guard_db_port(NOW), "restart")


class EnsureDb(GuardBase):
    def setUp(self):
        super().setUp()
        self.saved_sleep = wd.time.sleep
        wd.time.sleep = lambda s: None
        self.saved_wait = wd.wait_port

    def tearDown(self):
        wd.time.sleep = self.saved_sleep
        wd.wait_port = self.saved_wait
        super().tearDown()

    def test_running_container_with_open_port_is_left_alone(self):
        wd.wait_port = lambda s: True
        self.assertEqual(wd.ensure_db(), 0)
        self.assertEqual(self.run.calls, [])

    def test_running_container_with_closed_port_gets_one_restart(self):
        answers = iter([False, True])
        wd.wait_port = lambda s: next(answers)
        self.assertEqual(wd.ensure_db(), 0)
        self.assertEqual(self.run.calls, [["restart", wd.CONTAINER]])

    def test_stopped_container_is_started_after_the_settle(self):
        self.info = (False, LONG_AGO)
        wd.wait_port = lambda s: True
        self.assertEqual(wd.ensure_db(), 0)
        self.assertEqual(self.run.calls, [["start", wd.CONTAINER]])

    def test_missing_container_is_not_recreated(self):
        self.info = None
        self.assertEqual(wd.ensure_db(), 1)
        self.assertEqual(self.run.calls, [])

    def test_port_that_never_opens_reports_failure(self):
        wd.wait_port = lambda s: False
        self.assertEqual(wd.ensure_db(), 1)
        self.assertEqual(self.run.calls, [["restart", wd.CONTAINER]])


class DockerTime(unittest.TestCase):
    def test_nanoseconds_are_dropped(self):
        self.assertEqual(wd.parse_docker_time("2026-10-10T11:37:14.712153585Z"), 1791632234.0)

    def test_garbage_is_zero(self):
        self.assertEqual(wd.parse_docker_time("nope"), 0.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
