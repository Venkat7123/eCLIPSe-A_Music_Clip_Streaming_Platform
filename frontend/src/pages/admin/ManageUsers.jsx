import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Activity,
  Flame,
  Award
} from 'lucide-react';

const ManageUsers = ({
  users = [],
  loadUsers,
  onToggleStatus,
  onBoostStreams
}) => {
  const [userSearch, setUserSearch] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('All');

  useEffect(() => {
    loadUsers?.();
  }, []);

  const filteredUsers = (users || []).filter((u) => {
    const matchSearch = `${u.name} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase());
    const matchType = userTypeFilter === 'All' || u.role === userTypeFilter;
    return matchSearch && matchType;
  });

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const userCount = users.filter((u) => u.role === 'USER').length;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col gap-8 animate-[fadeIn_0.15s_ease-out] text-[#a0aec0] font-outfit">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white leading-tight">Users</h1>
          <p className="text-xs text-zinc-500 font-medium mt-1.5">View and manage all platform users</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="bg-[#12131a] border border-white/5 rounded-xl py-2.5 pl-9 pr-4 text-white text-xs outline-none focus:border-brand-primary transition w-56"
            />
          </div>

          <div className="relative flex items-center bg-[#12131a] border border-white/5 rounded-xl px-3 py-2 cursor-pointer">
            <Filter className="w-3.5 h-3.5 text-zinc-500 mr-2" />
            <select
              value={userTypeFilter}
              onChange={(e) => setUserTypeFilter(e.target.value)}
              className="bg-transparent text-white text-xs font-medium outline-none cursor-pointer pr-1"
            >
              <option value="All" className="bg-[#12131a]">All Users</option>
              <option value="ADMIN" className="bg-[#12131a]">Admins</option>
              <option value="USER" className="bg-[#12131a]">Standard Users</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: String(totalUsers), label2: 'All time', icon: Users, color: 'text-[#3b82f6] bg-[#3b82f6]/10' },
          { label: 'Admins', value: String(adminCount), label2: 'With admin access', icon: Award, color: 'text-[#f43f5e] bg-[#f43f5e]/10' },
          { label: 'Standard Users', value: String(userCount), label2: 'Regular accounts', icon: Activity, color: 'text-[#10b981] bg-[#10b981]/10' },
          { label: 'Recent', value: String(users.filter((u) => {
            const d = new Date(u.createdAt);
            return Date.now() - d.getTime() < 30 * 24 * 60 * 60 * 1000;
          }).length), label2: 'Joined this month', icon: Flame, color: 'text-[#f59e0b] bg-[#f59e0b]/10' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-[#131520] border border-white/5 rounded-2xl p-6 flex items-center gap-4 shadow-sm hover:border-white/10 transition">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${stat.color}`}>
                <Icon className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-medium block uppercase tracking-wider">{stat.label}</span>
                <span className="text-xl font-semibold text-white block mt-0.5 leading-none">{stat.value}</span>
                <span className="text-[9px] font-medium block mt-1 text-zinc-400">{stat.label2}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* User Table */}
      <div className="bg-[#131520] border border-white/5 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 font-medium tracking-wider uppercase bg-[#171926]/40 select-none">
                <th className="py-5 px-6 w-12 text-center">#</th>
                <th className="py-5 px-4">User</th>
                <th className="py-5 px-4">Email</th>
                <th className="py-5 px-4">Joined On</th>
                <th className="py-5 px-4">Role</th>
                <th className="py-5 px-4">Bio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user, idx) => (
                <tr key={user._id || user.uid} className="hover:bg-white/5 transition duration-150 text-zinc-300 font-medium">
                  <td className="py-5 px-6 text-center font-medium text-zinc-500">{idx + 1}</td>
                  <td className="py-5 px-4 font-medium text-white">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-zinc-950 text-xs shrink-0"
                        style={{ backgroundColor: user.avatarColor || '#a855f7' }}
                      >
                        {(user.name || user.email || '?')[0].toUpperCase()}
                      </div>
                      <span className="truncate block font-semibold text-xs text-white leading-tight">{user.name || 'Unnamed'}</span>
                    </div>
                  </td>
                  <td className="py-5 px-4 text-zinc-400 font-medium">{user.email}</td>
                  <td className="py-5 px-4 text-zinc-400 font-medium">{formatDate(user.createdAt)}</td>
                  <td className="py-5 px-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                      user.role === 'ADMIN'
                        ? 'bg-[#8b5cf6]/10 text-brand-primary border border-brand-primary/20'
                        : 'bg-zinc-500/10 text-zinc-400 border border-white/5'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-5 px-4 text-zinc-400 font-medium max-w-[200px] truncate">{user.bio || '—'}</td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-zinc-500 font-medium">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
        <span>Showing {filteredUsers.length} of {totalUsers} users</span>
      </div>
    </div>
  );
};

export default ManageUsers;
