-- Incidente 2026-09-09: o hook skill-invocation-gate envia decision='ask',
-- mas API e CHECK aceitavam somente allow/deny. Preservar ask como decisão
-- distinta registra o pedido de confirmação sem tratá-lo como permissão.
-- Ampliação aditiva do domínio: nenhuma linha ou coluna é alterada/apagada.
-- DO é atômico inclusive fora do runner; migrate.ts também usa transação.
-- Reexecutar produz o mesmo CHECK e preserva todos os dados.
DO $$
BEGIN
  ALTER TABLE skill_invocations
    DROP CONSTRAINT IF EXISTS skill_invocations_decision_check;
  ALTER TABLE skill_invocations
    ADD CONSTRAINT skill_invocations_decision_check
    CHECK (decision IN ('allow', 'deny', 'ask'));
END $$;

-- Rollback seguro: reverter o código mantendo este CHECK ampliado e o
-- histórico ask. Não converter ask em allow/deny nem apagar registros.
-- Somente se NÃO houver ask, o domínio antigo pode ser restaurado em uma
-- transação (o ADD falha e reverte tudo caso exista qualquer ask):
-- BEGIN;
-- ALTER TABLE skill_invocations DROP CONSTRAINT skill_invocations_decision_check;
-- ALTER TABLE skill_invocations ADD CONSTRAINT skill_invocations_decision_check
--   CHECK (decision IN ('allow', 'deny'));
-- COMMIT;
