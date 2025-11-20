'use client';

import { useEffect, useState } from 'react';
import { X, Users, ArrowRight } from 'lucide-react';

type RebalancingConfirmModalProps = {
  isOpen: boolean;
  onConfirm: (numberOfTables: number) => void;
  onCancel: () => void;
  activePlayers: number;
  seatsPerTable: number;
};

export default function RebalancingConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  activePlayers,
  seatsPerTable,
}: RebalancingConfirmModalProps) {
  // Calculate suggested number of tables
  const suggestedTables = activePlayers <= seatsPerTable
    ? 1
    : Math.ceil(activePlayers / seatsPerTable);

  const [numberOfTables, setNumberOfTables] = useState(suggestedTables);

  // Reset to suggestion when modal opens
  useEffect(() => {
    if (isOpen) {
      setNumberOfTables(suggestedTables);
    }
  }, [isOpen, suggestedTables]);

  // Calculate min and max tables
  const minTables = 1;
  const maxTables = Math.max(3, Math.ceil(activePlayers / 3)); // At least 3 players per table

  // Calculate distribution preview
  const calculateDistribution = (tables: number): string => {
    if (tables === 1) return `${activePlayers} joueurs`;

    const basePerTable = Math.floor(activePlayers / tables);
    const remainder = activePlayers % tables;

    const distribution: number[] = [];
    for (let i = 0; i < tables; i++) {
      distribution.push(basePerTable + (i < remainder ? 1 : 0));
    }

    return distribution.join('-') + ' joueurs';
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-4 border-orange-400 rounded-2xl shadow-2xl max-w-3xl w-full mx-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-t-xl flex justify-between items-center">
          <h2 className="text-4xl font-black text-white uppercase tracking-wider">
            ⚠️ Réassignation des Tables
          </h2>
          <button
            onClick={onCancel}
            className="bg-white/20 hover:bg-white/30 rounded-full p-3 transition-colors"
            aria-label="Annuler"
          >
            <X className="w-8 h-8 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Active Players */}
          <div className="bg-white/10 backdrop-blur border-2 border-white/20 rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Users className="w-8 h-8 text-cyan-400" />
              <div className="text-cyan-400 text-lg font-semibold">Joueurs Actifs</div>
            </div>
            <div className="text-white text-5xl font-black">{activePlayers}</div>
          </div>

          {/* Table Selection */}
          <div className="space-y-4">
            <div className="text-white text-2xl font-bold text-center">
              Choisissez le nombre de tables
            </div>

            {/* Slider */}
            <div className="space-y-4">
              <input
                type="range"
                min={minTables}
                max={maxTables}
                value={numberOfTables}
                onChange={(e) => setNumberOfTables(parseInt(e.target.value))}
                className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />

              {/* Number Display */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setNumberOfTables(Math.max(minTables, numberOfTables - 1))}
                  disabled={numberOfTables <= minTables}
                  className="bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-2xl w-12 h-12 rounded-lg transition-colors"
                >
                  -
                </button>

                <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl px-8 py-4 shadow-lg">
                  <div className="text-white text-6xl font-black">{numberOfTables}</div>
                  <div className="text-cyan-100 text-sm font-semibold text-center">
                    {numberOfTables === 1 ? 'table' : 'tables'}
                  </div>
                </div>

                <button
                  onClick={() => setNumberOfTables(Math.min(maxTables, numberOfTables + 1))}
                  disabled={numberOfTables >= maxTables}
                  className="bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-2xl w-12 h-12 rounded-lg transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Distribution Preview */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-center gap-3 text-white">
                <div className="text-lg font-semibold">Répartition :</div>
                <ArrowRight className="w-5 h-5 text-cyan-400" />
                <div className="text-xl font-black text-cyan-400">
                  {calculateDistribution(numberOfTables)}
                </div>
              </div>
            </div>

            {/* Suggestion Badge */}
            {numberOfTables === suggestedTables && (
              <div className="bg-green-500/20 border border-green-400 rounded-lg px-4 py-2 text-center">
                <div className="text-green-300 text-sm font-semibold">
                  💡 Répartition suggérée (≈{seatsPerTable} joueurs/table)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white/5 border-t border-white/10 p-6 flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-black text-xl px-6 py-4 rounded-xl transition-all"
          >
            ANNULER
          </button>
          <button
            onClick={() => onConfirm(numberOfTables)}
            className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xl px-6 py-4 rounded-xl shadow-lg transition-all"
          >
            CONFIRMER LA RÉASSIGNATION
          </button>
        </div>
      </div>
    </div>
  );
}
