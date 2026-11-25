import { MiraklBaseAdapter } from './MiraklBaseAdapter.js';

export class MakroAdapter extends MiraklBaseAdapter {
  readonly provider = 'makro' as const;
  readonly displayName = 'Makro Marketplace';
  protected readonly apiBaseUrl = 'https://makro-za.mirakl.net';
}
