<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreInventoryItemRequest;
use App\Http\Requests\StoreInventoryMovementRequest;
use App\Http\Requests\UpdateInventoryItemRequest;
use App\Models\InventoryItem;
use App\Services\InventoryItemService;
use App\Services\InventoryStockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryItemController extends Controller
{
    public function __construct(
        private readonly InventoryItemService $itemService,
        private readonly InventoryStockService $stockService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = InventoryItem::query()
            ->withCount('movements')
            ->latest();

        $stock = $request->string('stock');
        if ($stock->toString() === 'low') {
            $query->whereColumn('quantity_on_hand', '<=', 'reorder_level');
        } elseif ($stock->toString() === 'ok') {
            $query->whereColumn('quantity_on_hand', '>', 'reorder_level');
        }

        $items = $query->paginate((int) $request->integer('per_page', 15));

        return response()->json($items);
    }

    public function store(StoreInventoryItemRequest $request): JsonResponse
    {
        $item = $this->itemService->create($request->validated());

        return response()->json([
            'message' => 'Item inventori berhasil dibuat.',
            'data' => $item,
        ], 201);
    }

    public function show(InventoryItem $inventoryItem): JsonResponse
    {
        return response()->json([
            'data' => $inventoryItem->loadCount('movements'),
        ]);
    }

    public function update(UpdateInventoryItemRequest $request, InventoryItem $inventoryItem): JsonResponse
    {
        $item = $this->itemService->update($inventoryItem, $request->validated());

        return response()->json([
            'message' => 'Item inventori berhasil diperbarui.',
            'data' => $item,
        ]);
    }

    public function destroy(InventoryItem $inventoryItem): JsonResponse
    {
        $this->itemService->delete($inventoryItem);

        return response()->json([
            'message' => 'Item inventori berhasil dihapus.',
        ]);
    }

    public function movementsIndex(Request $request, InventoryItem $inventoryItem): JsonResponse
    {
        $movements = $inventoryItem->movements()
            ->with('creator:id,name')
            ->latest()
            ->paginate((int) $request->integer('per_page', 20));

        return response()->json($movements);
    }

    public function movementsStore(StoreInventoryMovementRequest $request, InventoryItem $inventoryItem): JsonResponse
    {
        $movement = $this->stockService->recordMovement(
            $inventoryItem,
            $request->validated(),
            (int) $request->user()->id
        );

        return response()->json([
            'message' => 'Pergerakan stok berhasil dicatat.',
            'data' => $movement->load(['item', 'creator:id,name']),
        ], 201);
    }
}
