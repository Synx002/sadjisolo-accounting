<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreInvoiceRequest;
use App\Http\Requests\UpdateInvoiceRequest;
use App\Models\Invoice;
use App\Services\InvoiceJournalService;
use App\Services\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function __construct(
        private readonly InvoiceService $invoiceService,
        private readonly InvoiceJournalService $invoiceJournalService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Invoice::query()
            ->with('items')
            ->latest();

        $status = $request->string('status');
        if ($status->isNotEmpty() && in_array($status->toString(), ['draft', 'sent', 'paid', 'cancelled'], true)) {
            $query->where('status', $status->toString());
        }

        $invoices = $query->paginate((int) $request->integer('per_page', 10));

        return response()->json($invoices);
    }

    public function store(StoreInvoiceRequest $request): JsonResponse
    {
        $invoice = $this->invoiceService->create(
            $request->validated(),
            (int) $request->user()->id
        );

        return response()->json([
            'message' => 'Invoice berhasil dibuat.',
            'data' => $invoice,
        ], 201);
    }

    public function show(Invoice $invoice): JsonResponse
    {
        return response()->json([
            'data' => $invoice->load('items'),
        ]);
    }

    public function update(UpdateInvoiceRequest $request, Invoice $invoice): JsonResponse
    {
        $invoice = $this->invoiceService->update($invoice, $request->validated());

        return response()->json([
            'message' => 'Invoice berhasil diperbarui.',
            'data' => $invoice,
        ]);
    }

    public function destroy(Invoice $invoice): JsonResponse
    {
        $this->invoiceService->delete($invoice);

        return response()->json([
            'message' => 'Invoice berhasil dihapus.',
        ]);
    }

    public function pay(Request $request, Invoice $invoice): JsonResponse
    {
        $journalEntry = $this->invoiceJournalService->postPaid(
            $invoice,
            (int) $request->user()->id
        );

        return response()->json([
            'message' => 'Invoice berhasil ditandai lunas dan jurnal diposting.',
            'data' => [
                'invoice' => $invoice->fresh('items', 'journalEntries'),
                'journal_entry' => $journalEntry,
            ],
        ]);
    }
}
