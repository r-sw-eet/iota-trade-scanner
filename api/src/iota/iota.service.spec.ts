import { Test } from '@nestjs/testing';
import { IotaService } from './iota.service';

type FetchMock = jest.Mock<Promise<{ json: () => any }>, [string, any?]>;

describe('IotaService', () => {
  let service: IotaService;
  let fetchMock: FetchMock;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [IotaService],
    }).compile();
    service = module.get(IotaService);
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  const rpcResponse = (result: unknown) =>
    Promise.resolve({ json: async () => ({ jsonrpc: '2.0', id: 1, result }) });
  const rpcError = (message: string) =>
    Promise.resolve({ json: async () => ({ jsonrpc: '2.0', id: 1, error: { message } }) });
  const graphqlResponse = (data: unknown) =>
    Promise.resolve({ json: async () => ({ data }) });
  const graphqlError = (message: string) =>
    Promise.resolve({ json: async () => ({ errors: [{ message }] }) });

  describe('nanosToIota', () => {
    it('converts zero', () => {
      expect(service.nanosToIota('0')).toBe(0);
    });

    it('converts 1 IOTA (1e9 nanos)', () => {
      expect(service.nanosToIota('1000000000')).toBe(1);
    });

    it('accepts bigint input', () => {
      expect(service.nanosToIota(1_000_000_000n)).toBe(1);
    });

    it('preserves 2 decimal places', () => {
      expect(service.nanosToIota('1234567890')).toBe(1.23);
    });

    it('handles supply-scale amounts', () => {
      expect(service.nanosToIota('4600000000000000000')).toBe(4_600_000_000);
    });

    it('floors sub-cent precision (integer BigInt division)', () => {
      expect(service.nanosToIota('1005000000')).toBe(1);
    });
  });

  describe('rpc error path', () => {
    it('throws a labelled error when the JSON-RPC call returns an error payload', async () => {
      fetchMock.mockReturnValueOnce(rpcError('boom'));
      await expect(service.getSystemState()).rejects.toThrow(/RPC iotax_getLatestIotaSystemState: boom/);
    });
  });

  describe('graphql error path', () => {
    it('throws a labelled error when the GraphQL call returns errors[]', async () => {
      fetchMock.mockReturnValueOnce(graphqlError('graphql boom'));
      await expect(service.getNetworkTotalTransactions()).rejects.toThrow(/GraphQL: graphql boom/);
    });
  });

  describe('getSystemState', () => {
    it('parses a full system-state RPC payload', async () => {
      fetchMock.mockReturnValueOnce(
        rpcResponse({
          epoch: '42',
          iotaTotalSupply: '4600000000000000000',
          totalStake: '2000000000000000000',
          storageFundTotalObjectStorageRebates: '5000000000',
          storageFundNonRefundableBalance: '1000000000',
          referenceGasPrice: '1000',
          epochDurationMs: '86400000',
          activeValidators: [{}, {}, {}],
        }),
      );

      const result = await service.getSystemState();
      expect(result).toMatchObject({
        epoch: 42,
        totalSupply: 4_600_000_000,
        totalStaked: 2_000_000_000,
        storageFundTotal: 5,
        storageFundNonRefundable: 1,
        referenceGasPrice: 1000,
        epochDurationMs: 86_400_000,
        validatorCount: 3,
      });
    });

    it('defaults validatorCount to 0 when activeValidators is missing', async () => {
      fetchMock.mockReturnValueOnce(
        rpcResponse({
          epoch: '5',
          iotaTotalSupply: '0',
          totalStake: '0',
          storageFundTotalObjectStorageRebates: '0',
          storageFundNonRefundableBalance: '0',
          referenceGasPrice: '0',
          epochDurationMs: '0',
        }),
      );
      const result = await service.getSystemState();
      expect(result.validatorCount).toBe(0);
    });
  });

  describe('getCirculatingSupply', () => {
    it('scales the percentage by 100 and converts nanos', async () => {
      fetchMock.mockReturnValueOnce(
        rpcResponse({
          value: '1000000000000',
          circulatingSupplyPercentage: 0.47,
          atCheckpoint: '12345',
        }),
      );
      const result = await service.getCirculatingSupply();
      expect(result).toEqual({
        circulatingSupply: 1000,
        circulatingPercentage: 47,
        atCheckpoint: 12345,
      });
    });
  });

  describe('getProtocolConfig', () => {
    it('reads attrs from the nested u64 envelope', async () => {
      fetchMock.mockReturnValueOnce(
        rpcResponse({
          attributes: {
            storage_gas_price: { u64: '80' },
            obj_data_cost_refundable: { u64: '120' },
            validator_target_reward: { u64: '767000000000000' },
          },
        }),
      );
      const result = await service.getProtocolConfig();
      expect(result).toEqual({
        storageGasPrice: 80,
        objDataCostRefundable: 120,
        validatorTargetReward: 767_000,
      });
    });

    it('falls back to defaults when attrs are missing', async () => {
      fetchMock.mockReturnValueOnce(rpcResponse({ attributes: {} }));
      const result = await service.getProtocolConfig();
      expect(result).toEqual({
        storageGasPrice: 76,
        objDataCostRefundable: 100,
        validatorTargetReward: 767_000,
      });
    });
  });

  describe('getValidatorsApy', () => {
    it('scales APYs by 100 and returns min/max/avg', async () => {
      fetchMock.mockReturnValueOnce(
        rpcResponse({
          epoch: '10',
          apys: [
            { address: '0xa', apy: 0.05 },
            { address: '0xb', apy: 0.07 },
            { address: '0xc', apy: 0.06 },
          ],
        }),
      );
      const result = await service.getValidatorsApy();
      expect(result.epoch).toBe(10);
      expect(result.validators).toHaveLength(3);
      expect(result.validators[0]).toEqual({ address: '0xa', apy: 5 });
      expect(result.validators[1].address).toBe('0xb');
      expect(result.validators[1].apy).toBeCloseTo(7);
      expect(result.validators[2].address).toBe('0xc');
      expect(result.validators[2].apy).toBeCloseTo(6);
      expect(result.min).toBe(5);
      expect(result.max).toBeCloseTo(7);
      expect(result.avg).toBeCloseTo(6);
    });
  });

  describe('getPreviousEpochStats', () => {
    it('fetches epoch=current-1 and divides gas/inflow by 1e9', async () => {
      fetchMock.mockReturnValueOnce(
        graphqlResponse({
          epoch: {
            epochId: '41',
            totalGasFees: '2000000000',
            totalStakeRewards: '767000000000000',
            referenceGasPrice: '1000',
            totalCheckpoints: '100',
            totalTransactions: '1000',
            fundSize: '0',
            fundInflow: '3000000000',
            fundOutflow: '2500000000',
            netInflow: '500000000',
            storageFund: { nonRefundableBalance: '0' },
          },
        }),
      );
      const result = await service.getPreviousEpochStats(42);
      expect(result).toEqual({
        epochGasBurned: 2,
        epochTransactions: 1000,
        epochStorageNetInflow: 0.5,
        epochStorageFeesIn: 3,
        epochStorageRebatesOut: 2.5,
        epochStakeRewards: 767000,
        epochReferenceGasPrice: 1000,
        epochNonRefundableBalance: 0,
        gasPerTransaction: 2 / 1000,
      });
      expect(fetchMock.mock.calls[0][1].body).toMatch(/epoch\(id: 41\)/);
    });

    it('returns gasPerTransaction=0 when txCount is 0', async () => {
      fetchMock.mockReturnValueOnce(
        graphqlResponse({
          epoch: {
            totalGasFees: '0',
            totalTransactions: '0',
            netInflow: '0',
            epochId: '0',
          },
        }),
      );
      const result = await service.getPreviousEpochStats(1);
      expect(result.gasPerTransaction).toBe(0);
    });
  });

  describe('getEpochSummary', () => {
    it('parses a full epoch payload', async () => {
      fetchMock.mockReturnValueOnce(
        graphqlResponse({
          epoch: {
            epochId: '5',
            totalGasFees: '1000000000',
            totalStakeRewards: '767000000000000',
            referenceGasPrice: '1000',
            totalTransactions: '500',
            fundInflow: '4000000000',
            fundOutflow: '2000000000',
            netInflow: '2000000000',
            fundSize: '10000000000',
            storageFund: { nonRefundableBalance: '0' },
          },
        }),
      );
      const result = await service.getEpochSummary(5);
      expect(result).toEqual({
        epoch: 5,
        epochGasBurned: 1,
        epochTransactions: 500,
        epochStorageNetInflow: 2,
        epochStorageFeesIn: 4,
        epochStorageRebatesOut: 2,
        epochStakeRewards: 767000,
        epochReferenceGasPrice: 1000,
        epochNonRefundableBalance: 0,
        gasPerTransaction: 1 / 500,
        storageFundTotal: 10,
      });
    });

    it('returns null when epoch is missing', async () => {
      fetchMock.mockReturnValueOnce(graphqlResponse({ epoch: null }));
      expect(await service.getEpochSummary(999)).toBeNull();
    });

    it('uses gasPerTransaction=0 when txCount is 0', async () => {
      fetchMock.mockReturnValueOnce(
        graphqlResponse({
          epoch: {
            epochId: '0',
            totalGasFees: '0',
            totalTransactions: '0',
            netInflow: '0',
            fundSize: '0',
          },
        }),
      );
      const result = await service.getEpochSummary(0);
      expect(result?.gasPerTransaction).toBe(0);
    });
  });

  describe('getNetworkTotalTransactions', () => {
    it('returns the checkpoint.networkTotalTransactions as a number', async () => {
      fetchMock.mockReturnValueOnce(
        graphqlResponse({ checkpoint: { networkTotalTransactions: '1234567' } }),
      );
      expect(await service.getNetworkTotalTransactions()).toBe(1234567);
    });
  });

  describe('captureFullSnapshot', () => {
    const systemStatePayload = {
      epoch: '42',
      iotaTotalSupply: '4600000000000000000',
      totalStake: '2000000000000000000',
      storageFundTotalObjectStorageRebates: '5000000000',
      storageFundNonRefundableBalance: '0',
      referenceGasPrice: '1000',
      epochDurationMs: '86400000',
      activeValidators: [{}],
    };
    const circulatingPayload = { value: '1000000000000', circulatingSupplyPercentage: 0.47, atCheckpoint: '12345' };
    const protocolPayload = {
      attributes: {
        storage_gas_price: { u64: '80' },
        obj_data_cost_refundable: { u64: '120' },
        validator_target_reward: { u64: '767000000000000' },
      },
    };
    const apyPayload = { epoch: '42', apys: [{ address: '0xa', apy: 0.05 }] };

    it('assembles a full snapshot from five parallel sources plus previous-epoch stats', async () => {
      fetchMock
        .mockReturnValueOnce(rpcResponse(systemStatePayload))
        .mockReturnValueOnce(rpcResponse(circulatingPayload))
        .mockReturnValueOnce(rpcResponse(protocolPayload))
        .mockReturnValueOnce(rpcResponse(apyPayload))
        .mockReturnValueOnce(graphqlResponse({ checkpoint: { networkTotalTransactions: '9999' } }))
        .mockReturnValueOnce(
          graphqlResponse({
            epoch: {
              epochId: '41',
              totalGasFees: '1000000000',
              totalTransactions: '1000',
              netInflow: '0',
              fundSize: '0',
            },
          }),
        );

      const snapshot = await service.captureFullSnapshot();
      expect(snapshot).toMatchObject({
        epoch: 42,
        totalSupply: 4_600_000_000,
        circulatingSupply: 1000,
        circulatingPercentage: 47,
        totalStaked: 2_000_000_000,
        storageFundTotal: 5,
        validatorCount: 1,
        validatorAvgApy: 5,
        validatorTargetReward: 767_000,
        weeklyInflation: 767_000 * 7,
        networkTotalTransactions: 9999,
        referenceGasPrice: 1000,
        storagePrice: 80,
        checkpointCount: 12345,
        epochGasBurned: 1,
        epochTransactions: 1000,
      });
      expect(snapshot.stakingRatio).toBeCloseTo((2_000_000_000 / 4_600_000_000) * 100);
      expect(snapshot.timestamp).toBeInstanceOf(Date);
    });

    it('tolerates a previous-epoch GraphQL failure and falls back to zeros', async () => {
      fetchMock
        .mockReturnValueOnce(rpcResponse(systemStatePayload))
        .mockReturnValueOnce(rpcResponse(circulatingPayload))
        .mockReturnValueOnce(rpcResponse(protocolPayload))
        .mockReturnValueOnce(rpcResponse(apyPayload))
        .mockReturnValueOnce(graphqlResponse({ checkpoint: { networkTotalTransactions: '9999' } }))
        .mockReturnValueOnce(graphqlError('epoch-unavailable'));

      const snapshot = await service.captureFullSnapshot();
      expect(snapshot.epochGasBurned).toBe(0);
      expect(snapshot.epochTransactions).toBe(0);
      expect(snapshot.gasPerTransaction).toBe(0);
    });
  });
});
