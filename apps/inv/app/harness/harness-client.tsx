'use client';

import { type Orchestrator, createOrchestrator } from '@kairn/orchestrator';
import { useEffect, useRef, useState } from 'react';
import './harness.css';
import { HARNESS_SECTIONS } from './sections';
import type { HarnessId } from './ids';

/**
 * Runs the real boot sequence over a chosen composition, so the harness
 * exercises the orchestrator the way an invitation does rather than a shortcut.
 * The gate is what makes the measurement window real: nothing is measured until
 * it opens.
 */
export function Harness({ order }: { order: HarnessId[] }) {
  const root = useRef<HTMLDivElement>(null);
  const orchestrator = useRef<Orchestrator | null>(null);
  const [assetsReady, setAssetsReady] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!root.current) return undefined;

    const instance = createOrchestrator({ root: root.current });
    orchestrator.current = instance;

    let cancelled = false;
    void instance.assetsReady().then(() => {
      if (!cancelled) setAssetsReady(true);
    });

    return () => {
      cancelled = true;
      instance.destroy();
      orchestrator.current = null;
    };
  }, []);

  async function openGate() {
    await orchestrator.current?.open();
    setOpened(true);
  }

  return (
    <div ref={root} data-testid="harness-root" data-opened={opened ? 'true' : undefined}>
      {!opened && (
        <div className="harness-gate">
          <button type="button" onClick={openGate} disabled={!assetsReady} data-testid="gate">
            {assetsReady ? 'Buka Undangan' : 'loading'}
          </button>
        </div>
      )}

      {order.map((id, index) => {
        const Section = HARNESS_SECTIONS[id];
        return <Section key={`${id}-${index}`} />;
      })}

      <footer data-testid="tail" className="harness">
        <p data-reveal="fade-up" data-testid="tail-reveal">
          tail
        </p>
      </footer>
    </div>
  );
}
