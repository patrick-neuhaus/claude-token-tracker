import { useAdminUsers } from "@/hooks/useSettings";
import { UserManagement } from "@/components/admin/UserManagement";

export function AdminPage() {
  const { data, isLoading } = useAdminUsers();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Gerenciamento de Usuarios</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <UserManagement users={(data as any[]) || []} />
      )}
    </div>
  );
}
