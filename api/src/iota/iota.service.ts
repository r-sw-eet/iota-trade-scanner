import { Injectable, Logger } from '@nestjs/common';

const RPC_URL = 'https://api.mainnet.iota.cafe';
const GRAPHQL_URL = 'https://graphql.mainnet.iota.cafe';
const NANOS_PER_IOTA = 1_000_000_000n;

@Injectable()
export class IotaService {
  private readonly logger = new Logger(IotaService.name);

  nanosToIota(nanos: string | bigint): number {
    const big = BigInt(nanos);
    // Preserve 2 decimal places: divide by 10^7, convert to number, divide by 100
    return Number(big / 10_000_000n) / 100;
  }

  private async rpc<T = any>(method: string, params: any[] = []): Promise<T> {
    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const json = await res.json();
    if (json.error) {
      throw new Error(`RPC ${method}: ${json.error.message}`);
    }
    return json.result;
  }

  private async graphql<T = any>(query: string): Promise<T> {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const json = await res.json();
    if (json.errors?.length) {
      throw new Error(`GraphQL: ${json.errors[0].message}`);
    }
    return json.data;
  }

  async getSystemState() {
    const state = await this.rpc('iotax_getLatestIotaSystemState');
    return {
      epoch: Number(state.epoch),
      totalSupply: this.nanosToIota(state.iotaTotalSupply),
      totalStaked: this.nanosToIota(state.totalStake),
      storageFundTotal: this.nanosToIota(state.storageFundTotalObjectStorageRebates),
      storageFundNonRefundable: this.nanosToIota(state.storageFundNonRefundableBalance),
      referenceGasPrice: Number(state.referenceGasPrice),
      epochDurationMs: Number(state.epochDurationMs),
      validatorCount: state.activeValidators?.length ?? 0,
    };
  }

  async getCirculatingSupply() {
    const result = await this.rpc('iotax_getCirculatingSupply');
    return {
      circulatingSupply: this.nanosToIota(result.value),
      circulatingPercentage: result.circulatingSupplyPercentage * 100,
      atCheckpoint: Number(result.atCheckpoint),
    };
  }

  async getProtocolConfig() {
    const config = await this.rpc('iota_getProtocolConfig');
    const attrs = config.attributes;
    return {
      storageGasPrice: Number(attrs.storage_gas_price?.u64 ?? 76),
      objDataCostRefundable: Number(attrs.obj_data_cost_refundable?.u64 ?? 100),
      validatorTargetReward: this.nanosToIota(attrs.validator_target_reward?.u64 ?? '767000000000000'),
    };
  }

  async getValidatorsApy() {
    const result = await this.rpc('iotax_getValidatorsApy');
    const apys = result.apys as { address: string; apy: number }[];
    const values = apys.map((v) => v.apy * 100);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return {
      epoch: Number(result.epoch),
      validators: apys.map((v) => ({
        address: v.address,
        apy: v.apy * 100,
      })),
      avg,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  private readonly EPOCH_FIELDS = `
    epochId
    totalGasFees
    totalStakeRewards
    referenceGasPrice
    totalCheckpoints
    totalTransactions
    fundSize
    fundInflow
    fundOutflow
    netInflow
    storageFund {
      nonRefundableBalance
    }
  `;

  private decodeEpoch(e: any) {
    const gasBurned = Number(e.totalGasFees) / 1_000_000_000;
    const txCount = Number(e.totalTransactions);
    return {
      epochGasBurned: gasBurned,
      epochTransactions: txCount,
      epochStorageNetInflow: Number(e.netInflow) / 1_000_000_000,
      epochStorageFeesIn: Number(e.fundInflow) / 1_000_000_000,
      epochStorageRebatesOut: Number(e.fundOutflow) / 1_000_000_000,
      epochStakeRewards: Number(e.totalStakeRewards) / 1_000_000_000,
      epochReferenceGasPrice: Number(e.referenceGasPrice),
      epochNonRefundableBalance: Number(e.storageFund?.nonRefundableBalance ?? 0) / 1_000_000_000,
      gasPerTransaction: txCount > 0 ? gasBurned / txCount : 0,
    };
  }

  async getPreviousEpochStats(currentEpoch: number) {
    const prevId = currentEpoch - 1;
    const data = await this.graphql(`{ epoch(id: ${prevId}) { ${this.EPOCH_FIELDS} } }`);
    return this.decodeEpoch(data.epoch);
  }

  async getEpochSummary(epochId: number) {
    const data = await this.graphql(`{ epoch(id: ${epochId}) { ${this.EPOCH_FIELDS} } }`);
    const e = data.epoch;
    if (!e) return null;
    return {
      epoch: Number(e.epochId),
      ...this.decodeEpoch(e),
      storageFundTotal: Number(e.fundSize) / 1_000_000_000,
    };
  }

  async getNetworkTotalTransactions(): Promise<number> {
    const data = await this.graphql(`{
      checkpoint { networkTotalTransactions }
    }`);
    return Number(data.checkpoint.networkTotalTransactions);
  }

  async captureFullSnapshot() {
    this.logger.log('Fetching IOTA mainnet data...');

    const [systemState, circulating, protocol, validators, networkTx] =
      await Promise.all([
        this.getSystemState(),
        this.getCirculatingSupply(),
        this.getProtocolConfig(),
        this.getValidatorsApy(),
        this.getNetworkTotalTransactions(),
      ]);

    // Previous epoch gas/tx data
    let epochStats: ReturnType<typeof this.decodeEpoch> = {
      epochGasBurned: 0,
      epochTransactions: 0,
      epochStorageNetInflow: 0,
      epochStorageFeesIn: 0,
      epochStorageRebatesOut: 0,
      epochStakeRewards: 0,
      epochReferenceGasPrice: 0,
      epochNonRefundableBalance: 0,
      gasPerTransaction: 0,
    };
    try {
      epochStats = await this.getPreviousEpochStats(systemState.epoch);
    } catch (e) {
      this.logger.warn('Failed to fetch previous epoch stats', e);
    }

    const dailyInflation = protocol.validatorTargetReward;
    const weeklyInflation = dailyInflation * 7;
    const stakingRatio = systemState.totalStaked / systemState.totalSupply * 100;

    return {
      epoch: systemState.epoch,
      timestamp: new Date(),
      totalSupply: systemState.totalSupply,
      circulatingSupply: circulating.circulatingSupply,
      circulatingPercentage: circulating.circulatingPercentage,
      totalStaked: systemState.totalStaked,
      stakingRatio,
      storageFundTotal: systemState.storageFundTotal,
      storageFundNonRefundable: systemState.storageFundNonRefundable,
      validatorCount: systemState.validatorCount,
      validatorAvgApy: validators.avg,
      validatorTargetReward: dailyInflation,
      weeklyInflation,
      networkTotalTransactions: networkTx,
      referenceGasPrice: systemState.referenceGasPrice,
      storagePrice: protocol.storageGasPrice,
      checkpointCount: circulating.atCheckpoint,
      ...epochStats,
    };
  }
}
