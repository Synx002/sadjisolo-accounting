<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFixedAssetDepreciationRequest;
use App\Http\Requests\StoreFixedAssetRequest;
use App\Http\Requests\UpdateFixedAssetRequest;
use App\Models\FixedAsset;
use App\Services\FixedAssetDepreciationService;
use App\Services\FixedAssetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FixedAssetController extends Controller
{
    public function __construct(
        private readonly FixedAssetService $assetService,
        private readonly FixedAssetDepreciationService $depreciationService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = FixedAsset::query()
            ->withCount('depreciationEntries')
            ->latest();

        $status = $request->string('status');
        if ($status->isNotEmpty() && in_array($status->toString(), ['active', 'fully_depreciated', 'disposed'], true)) {
            $query->where('status', $status->toString());
        }

        $assets = $query->paginate((int) $request->integer('per_page', 10));

        return response()->json($assets);
    }

    public function store(StoreFixedAssetRequest $request): JsonResponse
    {
        $asset = $this->assetService->create(
            $request->validated(),
            (int) $request->user()->id
        );

        return response()->json([
            'message' => 'Aset tetap berhasil didaftarkan.',
            'data' => $asset,
        ], 201);
    }

    public function show(FixedAsset $fixedAsset): JsonResponse
    {
        return response()->json([
            'data' => $fixedAsset->loadCount('depreciationEntries'),
        ]);
    }

    public function update(UpdateFixedAssetRequest $request, FixedAsset $fixedAsset): JsonResponse
    {
        $asset = $this->assetService->update($fixedAsset, $request->validated());

        return response()->json([
            'message' => 'Aset tetap berhasil diperbarui.',
            'data' => $asset,
        ]);
    }

    public function destroy(FixedAsset $fixedAsset): JsonResponse
    {
        $this->assetService->delete($fixedAsset);

        return response()->json([
            'message' => 'Aset tetap berhasil dihapus.',
        ]);
    }

    public function depreciationsIndex(Request $request, FixedAsset $fixedAsset): JsonResponse
    {
        $entries = $fixedAsset->depreciationEntries()
            ->with('creator:id,name')
            ->orderByDesc('period_year')
            ->orderByDesc('period_month')
            ->paginate((int) $request->integer('per_page', 24));

        return response()->json($entries);
    }

    public function depreciationsStore(StoreFixedAssetDepreciationRequest $request, FixedAsset $fixedAsset): JsonResponse
    {
        $validated = $request->validated();
        $entry = $this->depreciationService->recordPeriod(
            $fixedAsset,
            (int) $validated['period_year'],
            (int) $validated['period_month'],
            (int) $request->user()->id,
            $validated['note'] ?? null
        );

        return response()->json([
            'message' => 'Penyusutan periode berhasil dicatat.',
            'data' => $entry->load(['fixedAsset', 'creator:id,name']),
        ], 201);
    }
}
