'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
};

type TableAssignment = {
  id: string;
  playerId: string;
  tableNumber: number;
  seatNumber: number;
  player?: Player;
};

type Table = {
  tableNumber: number;
  players: TableAssignment[];
  activePlayers: number;
  totalPlayers: number;
};

type TableLayoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tables: Table[];
  totalPlayers: number;
};

export default function TableLayoutModal({
  isOpen,
  onClose,
  tables,
  totalPlayers,
}: TableLayoutModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-4 border-cyan-400 rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 p-6 rounded-t-xl flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-4xl font-black text-white uppercase tracking-wider">
            Nouveau Plan des Tables
          </h2>
          <button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 rounded-full p-3 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-8 h-8 text-white" />
          </button>
        </div>

        {/* Stats */}
        <div className="bg-white/5 border-b border-white/10 px-6 py-4">
          <div className="flex justify-center gap-8 text-center">
            <div>
              <div className="text-cyan-400 text-sm font-semibold mb-1">TABLES</div>
              <div className="text-white text-3xl font-black">{tables.length}</div>
            </div>
            <div>
              <div className="text-cyan-400 text-sm font-semibold mb-1">JOUEURS ACTIFS</div>
              <div className="text-white text-3xl font-black">{totalPlayers}</div>
            </div>
            <div>
              <div className="text-cyan-400 text-sm font-semibold mb-1">MOYENNE PAR TABLE</div>
              <div className="text-white text-3xl font-black">
                {tables.length > 0 ? Math.round(totalPlayers / tables.length) : 0}
              </div>
            </div>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables
              .sort((a, b) => a.tableNumber - b.tableNumber)
              .map((table) => (
                <div
                  key={table.tableNumber}
                  className="bg-gradient-to-br from-green-700 to-green-800 border-4 border-green-500 rounded-xl shadow-lg overflow-hidden"
                >
                  {/* Table Header */}
                  <div className="bg-gradient-to-r from-green-600 to-green-700 py-3 px-4 border-b-4 border-green-500">
                    <div className="text-center">
                      <div className="text-2xl font-black text-white">TABLE {table.tableNumber}</div>
                      <div className="text-sm text-green-200 font-semibold">
                        {table.activePlayers} {table.activePlayers > 1 ? 'joueurs' : 'joueur'}
                      </div>
                    </div>
                  </div>

                  {/* Players List */}
                  <div className="p-4 space-y-2">
                    {table.players
                      .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0))
                      .map((assignment) => (
                        <div
                          key={assignment.id}
                          className="bg-white/10 backdrop-blur border border-white/20 rounded-lg px-3 py-2 flex items-center gap-3"
                        >
                          <div className="bg-cyan-500 text-white font-black text-sm rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                            {assignment.seatNumber || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-bold truncate">
                              {assignment.player
                                ? `${assignment.player.firstName} ${assignment.player.lastName}`
                                : 'Joueur inconnu'}
                            </div>
                            {assignment.player?.nickname && (
                              <div className="text-green-200 text-sm truncate">
                                {assignment.player.nickname}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white/5 border-t border-white/10 p-6 text-center sticky bottom-0">
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-black text-xl px-8 py-4 rounded-xl shadow-lg transition-all"
          >
            FERMER
          </button>
        </div>
      </div>
    </div>
  );
}
