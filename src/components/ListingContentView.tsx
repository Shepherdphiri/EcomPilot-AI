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
      {/* Product Catalog Audit Selector */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">
              Listing Quality & Content Generator
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              9-point marketplace audit paired with English-language channel copy generation for Takealot and Shopify.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Language: English (Initial Release)
          </span>
        </div>

        {listings.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center text-sm text-slate-600">
            No catalog audit items loaded (Demo data removed). You can still enter your own product details below to generate Takealot & Shopify listings.
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {listings.map((item) => {
              const active = item.sku === selectedListing?.sku;
              return (
                <button
                  key={item.sku}
                  type="button"
                  onClick={() => handleSelectProduct(item)}
                  className={`flex items-center gap-3.5 rounded-lg border p-3.5 text-left transition-colors ${
                    active
                      ? 'border-blue-700 bg-blue-50/40'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-slate-500">{item.sku}</span>
                      <span
                        className={`font-mono text-sm font-bold tabular-nums ${scoreColorClass(
                          item.listingScore
                        )}`}
                      >
                        {item.listingScore}/100
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.status === 'suppressed'
                        ? 'Not buyable on Takealot'
                        : 'Optimization available'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Split Workspace: 9-Point Quality Audit + AI Generator */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left 5 cols: Quality Breakdown & Recommendations */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 xl:col-span-5">
          {!selectedListing ? (
            <div className="py-10 text-center">
              <h2 className="text-base font-semibold text-slate-900">
                Listing Quality Score
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                No catalog audits are currently loaded. Switch Workspace Data to Use Demo in the sidebar to inspect sample 9-point audits, or generate custom product copy on the right.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Listing Quality Score
                  </h2>
                  <p className="text-xs text-slate-500">
                    SKU {selectedListing.sku} · {selectedListing.category}
                  </p>
                </div>
                <span
                  className={`font-mono text-2xl font-bold tabular-nums ${scoreColorClass(
                    selectedListing.listingScore
                  )}`}
                >
                  {selectedListing.listingScore}/100
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {CHECK_LABELS.map((c) => {
                  const val = selectedListing.checks[c.key];
                  const barColor =
                    val >= 85 ? 'bg-emerald-600' : val >= 65 ? 'bg-amber-500' : 'bg-red-600';
                  return (
                    <div key={c.key}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{c.label}</span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {val}/100
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 border-t border-slate-200 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Audit Recommendations
                </h3>
                <ul className="mt-2.5 space-y-2 text-sm text-slate-700">
                  {selectedListing.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1 font-mono text-xs font-semibold text-blue-700">
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

        {/* Right 7 cols: AI Content Generator Form + Results */}
        <section className="rounded-lg border border-slate-200 bg-white p-6 xl:col-span-7">
          <h2 className="text-base font-semibold text-slate-900">
            Channel Copy Generator
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Upload a product image (optional) and verify dimensions and specs to generate channel-specific listings.
          </p>

          <form onSubmit={handleGenerate} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="gen-product-name"
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  Product Name
                </label>
                <input
                  id="gen-product-name"
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="gen-brand"
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  Brand & Category
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
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="gen-dimensions"
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  Product Dimensions & Weight
                </label>
                <input
                  id="gen-dimensions"
                  type="text"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Product Image Upload
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
                  <ImagePlus className="h-4 w-4 text-slate-500" />
                  <span className="truncate">
                    {uploadedImagePreview ? 'Custom image attached' : 'Upload PNG/JPG for visual inspection'}
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
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                Technical Specifications
              </label>
              <textarea
                id="gen-specs"
                rows={3}
                value={specifications}
                onChange={(e) => setSpecifications(e.target.value)}
                required
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              {uploadedImagePreview ? (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <img
                    src={uploadedImagePreview}
                    alt="Uploaded preview"
                    className="h-8 w-8 rounded border border-slate-200 object-cover"
                  />
                  <span>Image ready for multimodal analysis</span>
                </div>
              ) : (
                <span className="text-xs text-slate-500">
                  Generates Takealot and Shopify copy simultaneously
                </span>
              )}

              <button
                type="submit"
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Copy...
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
            <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {generated && (
            <div className="mt-6 space-y-4 border-t border-slate-200 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Generated Marketplace Assets
                  </p>
                  <p className="text-xs text-slate-600">{generated.rationale}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-emerald-700 tabular-nums">
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
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                    >
                      Apply Score to Audit
                    </button>
                  )}
                </div>
              </div>

              {(
                [
                  { id: 'takealot', label: 'Takealot Title', value: generated.takealotTitle },
                  { id: 'shopify', label: 'Shopify Title', value: generated.shopifyTitle },
                  { id: 'meta', label: 'Meta Description', value: generated.metaDescription },
                ] as const
              ).map((field) => (
                <div key={field.id} className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                      {field.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(field.id, field.value)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
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
                  <p className="mt-1 text-sm text-slate-900">{field.value}</p>
                </div>
              ))}

              <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    Bullet Points (5)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy('bullets', generated.bulletPoints.join('\n'))
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700"
                  >
                    {copiedField === 'bullets' ? 'Copied' : 'Copy All'}
                  </button>
                </div>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-slate-800">
                  {generated.bulletPoints.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
                <span className="text-xs font-semibold text-slate-600">
                  Product Description
                </span>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-800">
                  {generated.productDescription}
                </p>
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
                <span className="text-xs font-semibold text-slate-600">
                  Backend Search Keywords
                </span>
                <p className="mt-1 font-mono text-xs text-slate-700">
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
