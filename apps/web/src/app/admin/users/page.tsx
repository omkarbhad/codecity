"use client"

import { useEffect, useState } from "react"
import { Search, Shield, ShieldOff, Trash2 } from "lucide-react"

interface AdminUser {
  id: string
  name: string | null
  email: string
  image: string | null
  role: "USER" | "ADMIN"
  createdAt: string
  _count: { projects: number }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleRoleToggle(user: AdminUser) {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN"
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    })
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
    )
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this user?")) return
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    )
  }

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary/40">User Management</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            Users <span className="text-muted-foreground font-normal text-lg">({users.length})</span>
          </h1>
        </div>
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border/30 bg-card/30 py-2.5 pl-10 pr-4 font-mono text-xs text-foreground placeholder:text-muted-foreground/30 backdrop-blur-sm focus:outline-none focus:border-primary/30 transition-colors"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border/30">
        <table className="w-full text-sm">
          <thead className="border-b border-border/30 bg-card/30">
            <tr>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-wider uppercase text-muted-foreground/50">User</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-wider uppercase text-muted-foreground/50">Email</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-wider uppercase text-muted-foreground/50">Role</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-wider uppercase text-muted-foreground/50">Projects</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] tracking-wider uppercase text-muted-foreground/50">Joined</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] tracking-wider uppercase text-muted-foreground/50">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {filtered.map((user) => (
              <tr key={user.id} className="group transition-colors hover:bg-card/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {user.image ? (
                      <img src={user.image} alt="" className="h-6 w-6 rounded-full" />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 border border-primary/20 font-mono text-[9px] text-primary">
                        {user.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <span className="text-xs text-foreground">{user.name ?? "—"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2 py-0.5 font-mono text-[9px] tracking-wider uppercase ${
                      user.role === "ADMIN"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted text-muted-foreground border border-border/30"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{user._count.projects}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRoleToggle(user)}
                      className="rounded-md p-1.5 text-muted-foreground/50 hover:bg-primary/10 hover:text-primary transition-colors"
                      title={user.role === "ADMIN" ? "Demote to User" : "Promote to Admin"}
                    >
                      {user.role === "ADMIN" ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="rounded-md p-1.5 text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Delete user"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
