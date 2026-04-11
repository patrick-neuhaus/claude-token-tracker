import { useAdminUsers } from "@/hooks/useSettings";
import { UserManagement } from "@/components/admin/UserManagement";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminPage() {
  const { data, isLoading } = useAdminUsers();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Gerenciamento de Usuarios</h1>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <UserManagement users={data || []} />
      )}
    </div>
  );
}
