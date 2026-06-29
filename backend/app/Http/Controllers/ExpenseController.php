<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreExpenseRequest;
use App\Http\Requests\UpdateExpenseRequest;
use App\Models\Expense;
use App\Services\ExpenseJournalService;
use App\Services\ExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function __construct(
        private readonly ExpenseService $expenseService,
        private readonly ExpenseJournalService $expenseJournalService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Expense::query()->latest();

        $status = $request->string('status');
        if ($status->isNotEmpty() && in_array($status->toString(), ['draft', 'paid', 'cancelled'], true)) {
            $query->where('status', $status->toString());
        }

        $expenses = $query->paginate((int) $request->integer('per_page', 15));

        return response()->json($expenses);
    }

    public function store(StoreExpenseRequest $request): JsonResponse
    {
        $expense = $this->expenseService->create(
            $request->validated(),
            (int) $request->user()->id
        );

        return response()->json([
            'message' => 'Biaya berhasil dicatat.',
            'data' => $expense,
        ], 201);
    }

    public function show(Expense $expense): JsonResponse
    {
        return response()->json(['data' => $expense]);
    }

    public function update(UpdateExpenseRequest $request, Expense $expense): JsonResponse
    {
        $expense = $this->expenseService->update($expense, $request->validated());

        return response()->json([
            'message' => 'Biaya berhasil diperbarui.',
            'data' => $expense,
        ]);
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $this->expenseService->delete($expense);

        return response()->json([
            'message' => 'Biaya berhasil dihapus.',
        ]);
    }

    public function pay(Request $request, Expense $expense): JsonResponse
    {
        $journalEntry = $this->expenseJournalService->postPaid(
            $expense,
            (int) $request->user()->id
        );

        return response()->json([
            'message' => 'Biaya berhasil ditandai lunas dan jurnal diposting.',
            'data' => [
                'expense'       => $expense->fresh('journalEntries'),
                'journal_entry' => $journalEntry,
            ],
        ]);
    }
}
