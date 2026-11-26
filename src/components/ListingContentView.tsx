import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  ImagePlus,
  Loader2,
  PenLine,
} from 'lucide-react';
import { GeneratedListingContent, ProductListingAudit } from '../types/ecom';
import { postJson } from '../utils/api';
import { scoreColorClass } from '../utils/formatters';

interface ListingContentViewProps {
  listings: ProductListingAudit[];
  onApplyGeneratedContent: (sku: string, newScore: number) => void;
}

const CHECK_LABELS: Array<{ key: keyof ProductListingAudit['checks']; label: string }> = [
  { key: 'titleQuality', label: 'Title Quality' },
  { key: 'bulletPoints', label: 'Bullet Points' },
  { key: 'descriptionQuality', label: 'Description Quality' },
  { key: 'images', label: 'Main Images' },
  { key: 'lifestyleImages', label: 'Lifestyle Images' },
  { key: 'keywords', label: 'Backend Keywords' },
  { key: 'attributes', label: 'Channel Attributes' },
  { key: 'brandInfo', label: 'Brand Registry' },
  { key: 'categoryCorrectness', label: 'Category Mapping' },
];

export const ListingContentView: React.FC<ListingContentViewProps> = ({
  listings,
  onApplyGeneratedContent,
}) => {
  const [selectedSku, setSelectedSku] = useState<string>(listings[0]?.sku || '');
  const selectedListing =
    listings.find((l) => l.sku === selectedSku) || listings[0];

  const [productName, setProductName] = useState(selectedListing?.title || '');
  const [brand, setBrand] = useState(selectedListing?.brand || '');
  const [category, setCategory] = useState(selectedListing?.category || '');
  const [dimensions, setDimensions] = useState(selectedListing?.dimensions || '');
  const [specifications, setSpecifications] = useState(
    selectedListing?.specifications || ''
  );
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [uploadedMimeType, setUploadedMimeType] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedListingContent | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleSelectProduct = (item: ProductListingAudit) => {
    setSelectedSku(item.sku);
    setProductName(item.title);
    setBrand(item.brand);
    setCategory(item.category);
    setDimensions(item.dimensions);
    setSpecifications(item.specifications);
    setGenerated(null);
    setErrorMsg(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setUploadedImagePreview(compressed);
          const parts = compressed.split(',');
          if (parts.length === 2) {
            setUploadedBase64(parts[1]);
            setUploadedMimeType('image/jpeg');
          }
          return;
        }
        setUploadedImagePreview(result);
        const parts = result.split(',');
        if (parts.length === 2) {
          setUploadedBase64(parts[1]);
          setUploadedMimeType(file.type || 'image/jpeg');
        }
      };
      img.onerror = () => {
        setUploadedImagePreview(result);
        const parts = result.split(',');
        if (parts.length === 2) {
          setUploadedBase64(parts[1]);
          setUploadedMimeType(file.type || 'image/jpeg');
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleCopy = (field: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setErrorMsg(null);

    try {
      const data = await postJson<GeneratedListingContent>(
        '/api/ai/content-generate',
        {
          productName,
          sku: selectedListing?.sku,
          brand,
          category,
          dimensions,
          specifications,
          currentIssues: selectedListing?.recommendations.join('; '),
          imageBase64: uploadedBase64,
          imageMimeType: uploadedMimeType,
        }
      );
      setGenerated(data);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to reach AI content service.'
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-100">
              AI Listing Optimizer
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Listing health scoring (0–100), SEO, image &amp; attribute gap detection, competitive benchmarking, and multimodal channel copy generation.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
            Takealot · Amazon · Shopify · Makro
          </span>
        </div>

        {listings.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-white/[0.12] bg-[#0E1118] px-5 py-6 text-center text-sm text-slate-400">
            No catalog audit items loaded. Enter custom product specs below to generate optimized channel listings, or enable Demo Data in the sidebar.
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {listings.map((item) => {
              const active = item.sku === selectedListing?.sku;
              return (
                <button
                  key={item.sku}
                  type="button"
                  onClick={() => handleSelectProduct(item)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    active
                      ? 'border-blue-500/60 bg-blue-600/10'
                      : 'border-white/[0.08] bg-[#0E1118] hover:border-white/20'
                  }`}
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-white/[0.08] bg-[#161B26]">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-slate-400">{item.sku}</span>
                      <span
                        className={`text-sm font-bold tabular-nums ${scoreColorClass(
                          item.listingScore
                        )}`}
                      >
                        {item.listingScore}/100
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-semibold text-slate-100">
                      {item.title}
                    </p>
                    <p
                      className={`mt-0.5 text-[11px] ${
                        item.status === 'suppressed'
                          ? 'text-rose-400'
                          : item.status === 'needs_optimization'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {item.status === 'suppressed'
                        ? 'Suppressed / Missing Image'
                        : item.status === 'needs_optimization'
                        ? `${item.missingAttributes.length} attribute gaps`
                        : 'Healthy'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left 5 cols: 5-Pillar Scorecard + 9-Point Audit */}
        <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6 xl:col-span-5">
          {!selectedListing ? (
            <div className="py-10 text-center">
              <h2 className="text-base font-semibold text-slate-100">
                Listing Health Scorecard
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Load Demo Data in the sidebar to inspect 5-pillar SKU diagnostics, or generate custom copy on the right.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">
                    Listing Health Scorecard
                  </h2>
                  <p className="text-xs text-slate-400">
                    {selectedListing.sku} · Benchmark vs Top Competitor:{' '}
                    <span className="font-semibold text-slate-200 tabular-nums">
                      {selectedListing.competitorBenchmarkScore}/100
                    </span>
                  </p>
                </div>
                <span
                  className={`text-2xl font-bold tabular-nums ${scoreColorClass(
                    selectedListing.listingScore
                  )}`}
                >
                  {selectedListing.listingScore}/100
                </span>
              </div>

              {/* 4 Pillar Sub-scores */}
              <div className="mt-4 grid grid-cols-2 gap-3 border-b border-white/[0.08] pb-4">
                <div className="rounded-lg border border-white/[0.06] bg-[#0E1118] p-2.5">
                  <p className="text-[11px] text-slate-400">SEO Score</p>
                  <p className={`text-base font-bold tabular-nums ${scoreColorClass(selectedListing.seoScore)}`}>
                    {selectedListing.seoScore}/100
                  </p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-[#0E1118] p-2.5">
                  <p className="text-[11px] text-slate-400">Image Quality</p>
                  <p className={`text-base font-bold tabular-nums ${scoreColorClass(selectedListing.imageQualityScore)}`}>
                    {selectedListing.imageQualityScore}/100
                  </p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-[#0E1118] p-2.5">
                  <p className="text-[11px] text-slate-400">Completeness</p>
                  <p className={`text-base font-bold tabular-nums ${scoreColorClass(selectedListing.contentCompletenessScore)}`}>
                    {selectedListing.contentCompletenessScore}/100
                  </p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-[#0E1118] p-2.5">
                  <p className="text-[11px] text-slate-400">Conversion Opt.</p>
                  <p className={`text-base font-bold tabular-nums ${scoreColorClass(selectedListing.conversionScore)}`}>
                    {selectedListing.conversionScore}/100
                  </p>
                </div>
              </div>

              {selectedListing.missingAttributes.length > 0 && (
                <div className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-200">
                  <p className="font-semibold">
                    Missing Attributes ({selectedListing.missingAttributes.length}) &amp; Images ({selectedListing.missingImagesCount})
                  </p>
                  <p className="mt-1 text-rose-300">
                    {selectedListing.missingAttributes.join(' · ')}
                  </p>
                </div>
              )}

              <div className="mt-4 space-y-2.5">
                {CHECK_LABELS.map((c) => {
                  const val = selectedListing.checks[c.key];
                  const barColor =
                    val >= 85 ? 'bg-emerald-500' : val >= 65 ? 'bg-amber-400' : 'bg-rose-500';
                  return (
                    <div key={c.key}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">{c.label}</span>
                        <span className="font-semibold text-slate-100 tabular-nums">
                          {val}/100
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 border-t border-white/[0.08] pt-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  AI Optimization Recommendations
                </h3>
                <ul className="mt-2.5 space-y-2 text-xs text-slate-300">
                  {selectedListing.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-mono font-semibold text-blue-400">
                        0{idx + 1}.
                      </span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>

        {/* Right 7 cols: AI Copy Generator */}
        <section className="rounded-xl border border-white/[0.08] bg-[#121620] p-5 lg:p-6 xl:col-span-7">
          <h2 className="text-base font-semibold text-slate-100">
            AI Channel Copy &amp; Keyword Generator
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Upload a product photo (optional) and verify specs to generate optimized titles, bullets, descriptions, and search keywords.
          </p>

          <form onSubmit={handleGenerate} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="gen-product-name"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  Product Name
                </label>
                <input
                  id="gen-product-name"
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="gen-brand"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  Brand &amp; Category
                </label>
                <input
                  id="gen-brand"
                  type="text"
                  value={`${brand} — ${category}`}
                  onChange={(e) => {
                    const [b, ...rest] = e.target.value.split('—');
                    setBrand(b.trim());
                    if (rest.length) setCategory(rest.join('—').trim());
                  }}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="gen-dimensions"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  Dimensions &amp; Weight
                </label>
                <input
                  id="gen-dimensions"
                  type="text"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Product Image Upload
                </label>
                <label className="flex min-h-[38px] cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-white/[0.18] bg-[#0B0D12] px-3 py-2 text-xs font-medium text-slate-300 hover:border-blue-400">
                  <ImagePlus className="h-4 w-4 text-slate-400" />
                  <span className="truncate">
                    {uploadedImagePreview
                      ? 'Image attached for vision analysis'
                      : 'Upload PNG/JPG for visual inspection'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label
                htmlFor="gen-specs"
                className="mb-1 block text-xs font-medium text-slate-300"
              >
                Technical Specifications
              </label>
              <textarea
                id="gen-specs"
                rows={3}
                value={specifications}
                onChange={(e) => setSpecifications(e.target.value)}
                required
                className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {uploadedImagePreview ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <img
                    src={uploadedImagePreview}
                    alt="Uploaded preview"
                    className="h-8 w-8 rounded border border-white/[0.1] object-cover"
                  />
                  <span>Ready for multimodal copy generation</span>
                </div>
              ) : (
                <span className="text-xs text-slate-500">
                  Generates marketplace titles, 5 bullets, description &amp; SEO keywords
                </span>
              )}

              <button
                type="submit"
                disabled={generating}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60 whitespace-nowrap"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Optimizing Listing...
                  </>
                ) : (
                  <>
                    <PenLine className="h-4 w-4" />
                    Generate Channel Listings
                  </>
                )}
              </button>
            </div>
          </form>

          {errorMsg && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {generated && (
            <div className="mt-6 space-y-4 border-t border-white/[0.08] pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    Optimized Listing Assets
                  </p>
                  <p className="text-xs text-slate-400">{generated.rationale}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-emerald-400 tabular-nums">
                    Projected Score: {generated.projectedScore}/100
                  </span>
                  {selectedListing && (
                    <button
                      type="button"
                      onClick={() =>
                        onApplyGeneratedContent(
                          selectedListing.sku,
                          generated.projectedScore
                        )
                      }
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap"
                    >
                      Apply to Audit
                    </button>
                  )}
                </div>
              </div>

              {(
                [
                  { id: 'takealot', label: 'Takealot / Marketplace Title', value: generated.takealotTitle },
                  { id: 'shopify', label: 'Shopify / D2C Headline', value: generated.shopifyTitle },
                  { id: 'meta', label: 'SEO Meta Description', value: generated.metaDescription },
                ] as const
              ).map((field) => (
                <div
                  key={field.id}
                  className="rounded-lg border border-white/[0.08] bg-[#0E1118] p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">
                      {field.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(field.id, field.value)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
                    >
                      {copiedField === field.id ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-slate-100">{field.value}</p>
                </div>
              ))}

              <div className="rounded-lg border border-white/[0.08] bg-[#0E1118] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Bullet Points (5)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('bullets', generated.bulletPoints.join('\n'))}
                    className="text-xs font-medium text-blue-400"
                  >
                    {copiedField === 'bullets' ? 'Copied' : 'Copy All'}
                  </button>
                </div>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-slate-200">
                  {generated.bulletPoints.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-white/[0.08] bg-[#0E1118] p-3">
                <span className="text-xs font-medium text-slate-400">Product Description</span>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-200">
                  {generated.productDescription}
                </p>
              </div>

              <div className="rounded-lg border border-white/[0.08] bg-[#0E1118] p-3">
                <span className="text-xs font-medium text-slate-400">
                  Backend Search Keywords
                </span>
                <p className="mt-1 font-mono text-xs text-slate-300">
                  {generated.keywords.join(' · ')}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
