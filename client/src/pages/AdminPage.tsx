import { useAdminUsers } from "@/hooks/useSettings";
import { UserManagement } from "@/components/admin/UserManagement";
import { SkeletonRows } from "@/components/shared/SkeletonGrid";

export function AdminPage() {
  const { data, isLoading } = useAdminUsers();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Gerenciamento de Usuarios</h2>
      {isLoading ? (
        <SkeletonRows count={5} />
      ) : (
        <UserManagement users={data || []} />
      )}
    </div>
  );
}
