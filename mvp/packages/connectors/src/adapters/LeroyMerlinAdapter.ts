import { MiraklBaseAdapter } from './MiraklBaseAdapter.js';

export class LeroyMerlinAdapter extends MiraklBaseAdapter {
  readonly provider = 'leroy_merlin' as const;
  readonly displayName = 'Leroy Merlin Marketplace';
  protected readonly apiBaseUrl = 'https://leroymerlin-za.mirakl.net';
}
