<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePurchaseBillRequest;
use App\Http\Requests\UpdatePurchaseBillRequest;
use App\Models\PurchaseBill;
use App\Services\PurchaseBillJournalService;
use App\Services\PurchaseBillService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchaseBillController extends Controller
{
    public function __construct(
        private readonly PurchaseBillService $purchaseBillService,
        private readonly PurchaseBillJournalService $purchaseBillJournalService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $query = PurchaseBill::query()
            ->with('items')
            ->latest();

        $status = $request->string('status');
        if ($status->isNotEmpty() && in_array($status->toString(), ['draft', 'received', 'paid', 'cancelled'], true)) {
            $query->where('status', $status->toString());
        }

        $bills = $query->paginate((int) $request->integer('per_page', 10));

        return response()->json($bills);
    }

    public function store(StorePurchaseBillRequest $request): JsonResponse
    {
        $bill = $this->purchaseBillService->create(
            $request->validated(),
            (int) $request->user()->id
        );

        return response()->json([
            'message' => 'Purchase bill berhasil dibuat.',
            'data' => $bill,
        ], 201);
    }

    public function show(PurchaseBill $purchaseBill): JsonResponse
    {
        return response()->json([
            'data' => $purchaseBill->load('items'),
        ]);
    }

    public function update(UpdatePurchaseBillRequest $request, PurchaseBill $purchaseBill): JsonResponse
    {
        $bill = $this->purchaseBillService->update($purchaseBill, $request->validated());

        return response()->json([
            'message' => 'Purchase bill berhasil diperbarui.',
            'data' => $bill,
        ]);
    }

    public function destroy(PurchaseBill $purchaseBill): JsonResponse
    {
        $this->purchaseBillService->delete($purchaseBill);

        return response()->json([
            'message' => 'Purchase bill berhasil dihapus.',
        ]);
    }

    public function pay(Request $request, PurchaseBill $purchaseBill): JsonResponse
    {
        $journalEntry = $this->purchaseBillJournalService->postPaid(
            $purchaseBill,
            (int) $request->user()->id
        );

        return response()->json([
            'message' => 'Purchase bill berhasil ditandai lunas dan jurnal diposting.',
            'data' => [
                'purchase_bill' => $purchaseBill->fresh('items', 'journalEntries'),
                'journal_entry' => $journalEntry,
            ],
        ]);
    }
}
