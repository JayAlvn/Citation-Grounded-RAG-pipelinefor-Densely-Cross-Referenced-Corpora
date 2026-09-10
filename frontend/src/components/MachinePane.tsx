import { tidyCpu, type MachineStats } from '../lib/useMachineStats';

const GREEN = '#22c55e';
const BLUE = '#3b82f6';
const AMBER = '#f59e0b';

function Meter({ pct, color }: { pct: number; color: string }) {
  return (
    <div
      className="h-1.5 w-full rounded-full overflow-hidden"
      style={{ backgroundColor: 'var(--card-bg)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }}
      />
    </div>
  );
}

// One line per device: label, a half-width meter, and the numbers inline —
// keeps the machine section compact enough to sit above the document list.
function LoadRow({
  label,
  pct,
  color,
  stats,
}: {
  label: string;
  pct: number;
  color: string;
  stats: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="w-1/2 shrink-0">
        <Meter pct={pct} color={color} />
      </div>
      <span className="ml-auto text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
        {stats}
      </span>
    </div>
  );
}

export function MachinePane({
  machine,
}: {
  machine: MachineStats | null;
}) {
  if (!machine) return null;

  const { specs, gpu, cpu, model } = machine;

  return (
    <div>
      <h3
        className="text-[11px] font-semibold tracking-widest uppercase mb-3"
        style={{ color: 'var(--text-muted)' }}
      >
        Machine
      </h3>

      {/* Static identity — what this pipeline is actually running on. */}
      <div className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
        <p style={{ color: 'var(--text-main)' }}>
          {tidyCpu(specs.cpu)} · {specs.cores} cores
        </p>
        <p style={{ color: 'var(--text-main)' }}>
          {specs.gpu
            ? `${specs.gpu} · ${((specs.vram_total_mb ?? 0) / 1024).toFixed(1)} GB VRAM`
            : 'No CUDA GPU — running on CPU'}
        </p>
        <p>{specs.ram_total_gb} GB RAM · {specs.os}</p>
      </div>

      {/* Live load */}
      <div className="mb-4 space-y-2">
        {gpu && (
          <LoadRow
            label="GPU"
            pct={gpu.util}
            color={GREEN}
            stats={`${gpu.util}% · ${(gpu.vram_used_mb / 1024).toFixed(1)} / ${(gpu.vram_total_mb / 1024).toFixed(1)} GB · ${gpu.temp_c}°C`}
          />
        )}
        <LoadRow
          label="CPU"
          pct={cpu.util}
          color={BLUE}
          stats={`${cpu.util.toFixed(0)}% · ${cpu.ram_used_gb} / ${cpu.ram_total_gb} GB RAM`}
        />
      </div>

      {/* Model residency — the real explanation for generation speed. */}
      {model && (
        <div
          className="rounded-lg p-2.5 text-xs"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: `1px solid ${model.loaded ? 'var(--border-color)' : AMBER}`,
          }}
        >
          {model.loaded ? (
            <>
              <span className="font-semibold" style={{ color: 'var(--text-main)' }}>
                {model.name}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                {' '}· {model.size_gb} GB · {model.gpu_percent}% on GPU
              </span>
              {(model.gpu_percent ?? 100) < 100 && (
                <p className="mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {100 - (model.gpu_percent ?? 0)}% of layers offloaded to system RAM —
                  generation throughput is bound by CPU memory bandwidth rather than the GPU.
                </p>
              )}
            </>
          ) : (
            <span style={{ color: AMBER }}>
              Model not loaded — the next query spends ~10s reloading it first.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
