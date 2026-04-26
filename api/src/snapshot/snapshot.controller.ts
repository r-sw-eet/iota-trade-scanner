import { Controller, Get, Query } from '@nestjs/common';
import { SnapshotService } from './snapshot.service';

@Controller('snapshots')
export class SnapshotController {
  constructor(private snapshotService: SnapshotService) {}

  @Get('latest')
  getLatest() {
    return this.snapshotService.getLatest();
  }

  @Get('history')
  getHistory(@Query('days') days?: string) {
    return this.snapshotService.getHistory(Number(days) || 30);
  }

  @Get('epochs')
  getEpochHistory() {
    return this.snapshotService.getEpochHistory();
  }

  @Get('aggregates')
  getAggregates() {
    return this.snapshotService.getAggregates();
  }
}
