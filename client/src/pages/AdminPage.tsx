import { useAdminUsers } from "@/hooks/useSettings";
import { UserManagement } from "@/components/admin/UserManagement";
import { SkeletonRows } from "@/components/shared/SkeletonGrid";
import { PageHeader } from "@/components/shared/PageHeader";

export function AdminPage() {
  const { data, isLoading } = useAdminUsers();

  return (
    <div className="space-y-4">
      <PageHeader title="Gerenciamento de Usuários" />
      {isLoading ? (
        <SkeletonRows count={5} />
      ) : (
        <UserManagement users={data || []} />
      )}
    </div>
  );
}
