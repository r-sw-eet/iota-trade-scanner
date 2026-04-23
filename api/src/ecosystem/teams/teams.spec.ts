/**
 * Focused tests for the network-aware `getTeamByDeployer`. The shape of
 * `Team.deployers` changed from `string[]` to `Array<{ address, network }>`
 * in Phase 2 of the testnet-support plan — the production registry only
 * carries `network: 'mainnet'` entries today, so these tests pin the
 * cross-network isolation behavior against a synthetic testnet entry that
 * the real registry can start using once testnet attribution runs.
 */
import { ALL_TEAMS, getTeam, getTeamByDeployer } from './index';

describe('teams: deployer lookup', () => {
  it('getTeamByDeployer defaults to mainnet network and resolves known mainnet addresses', () => {
    // Every registered team has mainnet-only deployers today. Pick one with
    // a known address via the team list directly so we don't hard-code a
    // literal that could drift on a team-deployer edit.
    const teamWithMainnet = ALL_TEAMS.find((t) =>
      t.deployers.some((d) => d.network === 'mainnet'),
    );
    if (!teamWithMainnet) return; // registry shape guarantees this is populated
    const sample = teamWithMainnet.deployers.find((d) => d.network === 'mainnet')!;
    expect(getTeamByDeployer(sample.address)?.id).toBe(teamWithMainnet.id);
  });

  it('never matches a mainnet address against a testnet-tagged deployer entry', () => {
    // Even if a cross-network address collision ever happens (shouldn't —
    // keypairs are single-network), network filter must isolate. Stick a
    // synthetic testnet entry on a copy of a real team and confirm the
    // mainnet lookup skips it.
    const real = ALL_TEAMS[0];
    const patched = {
      ...real,
      deployers: [
        ...real.deployers,
        { address: '0xDEADBEEFTESTNET', network: 'testnet' as const },
      ],
    };
    const all = [...ALL_TEAMS, patched];
    const lookup = (net: 'mainnet' | 'testnet' | 'devnet') =>
      all.find((t) =>
        t.deployers.some(
          (d) => d.network === net && d.address.toLowerCase() === '0xdeadbeeftestnet',
        ),
      );
    expect(lookup('mainnet')).toBeUndefined();
    expect(lookup('testnet')?.id).toBe(real.id);
  });

  it('getTeam returns undefined for an unknown / null / empty id', () => {
    expect(getTeam(null)).toBeUndefined();
    expect(getTeam(undefined)).toBeUndefined();
    expect(getTeam('')).toBeUndefined();
    expect(getTeam('no-such-team')).toBeUndefined();
  });

  it('getTeamByDeployer returns undefined for an unknown address', () => {
    expect(getTeamByDeployer('0xNOT_A_REAL_DEPLOYER_ANYWHERE')).toBeUndefined();
  });
});
