<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Expense;
use App\Models\InventoryItem;
use App\Models\Invoice;
use App\Models\JournalEntry;
use App\Models\PurchaseBill;
use App\Models\User;
use App\Services\ExpenseJournalService;
use App\Services\ExpenseService;
use App\Services\InventoryStockService;
use App\Services\InvoiceJournalService;
use App\Services\InvoiceService;
use App\Services\JournalEntryService;
use App\Services\PurchaseBillJournalService;
use App\Services\PurchaseBillService;
use Illuminate\Database\Seeder;

/**
 * DummyDataSeeder — Sadji Solo Snack (makanan ringan), pembiayaan modal sendiri.
 *
 * Kas diasumsikan 100% dari setoran pemilik (Debit Bank / Kredit Modal), tanpa pinjaman.
 *
 * Batch 23 pack — modal bahan Rp 149.180; biaya ops batch Rp 32.000 (TK + utilitas + transport).
 * Harga jual skenario seed: Rp 13.000/pack → pendapatan Rp 299.000 (23 × 13.000).
 * Laba kotor vs bahan: Rp 149.820; laba setelah biaya ops: Rp 117.820.
 *
 * Catatan: pembelian bahan di-mapping aplikasi ke BPP saat lunas; inventori produk jadi untuk pelacakan qty,
 * bukan jurnal COGS terpisah.
 */
class DummyDataSeeder extends Seeder
{
    private const OPENING_REF = 'MODAL-SNACK-2026';

    private const CLOSING_REF = 'CLOSING-SNACK-2026-05';

    /** Modal sendiri pemilik — cukup untuk bahan + ops sebelum penjualan (tanpa utang) */
    private const OPENING_CAPITAL = 250_000;

    private const MATERIAL_TOTAL = 149_180;

    private const PACK_OUTPUT = 23;

    /** Harga jual aktual batch ini — tier untung besar (~100% vs HPP bahan) */
    private const UNIT_PRICE_MAIN = 13_000;

    private const REVENUE_PAID = 299_000;

    private const COGS_PURCHASES = 149_180;

    private const OPS_LABOR = 20_000;

    private const OPS_UTILITIES = 7_000;

    private const OPS_TRANSPORT = 5_000;

    public function run(): void
    {
        /** @var User $user */
        $user = User::query()->where('email', 'test@example.com')->firstOrFail();
        $userId = (int) $user->id;

        $this->command->info('🍿  Sadji Solo Snack — seed dummy (modal sendiri, jual Rp '.number_format(self::UNIT_PRICE_MAIN, 0, ',', '.').'/pack)...');

        $this->seedOpeningCapital($userId);
        $this->seedPurchaseMaterials($userId);
        $this->seedOperationalBatchCosts($userId);
        $this->seedFinishedGoodsInventory($userId);
        $this->seedInvoices($userId);
        $this->seedClosingEntry($userId);

        $this->command->info('✅  Selesai. Modal dari pemilik saja; laba contoh batch → Modal.');
    }

    private function seedOpeningCapital(int $userId): void
    {
        if (JournalEntry::query()->where('reference', self::OPENING_REF)->exists()) {
            $this->command->line('   [skip] Modal snack sudah ada.');

            return;
        }

        $bank = $this->acc('1-1200');
        $modal = $this->acc('3-3100');

        /** @var JournalEntryService $svc */
        $svc = app(JournalEntryService::class);

        $entry = $svc->createDraft([
            'entry_date' => '2026-05-02',
            'reference' => self::OPENING_REF,
            'description' => 'Setoran modal sendiri pemilik — Sadji Solo Snack (tanpa pinjaman)',
            'lines' => [
                ['account_id' => $bank->id, 'debit' => self::OPENING_CAPITAL, 'credit' => 0, 'description' => 'Kas bank dari modal pemilik'],
                ['account_id' => $modal->id, 'debit' => 0, 'credit' => self::OPENING_CAPITAL, 'description' => 'Modal pemilik — bukan utang'],
            ],
        ], $userId);

        $svc->post($entry);
        $this->command->line('   ✓ Modal sendiri Rp '.number_format(self::OPENING_CAPITAL, 0, ',', '.').' masuk Bank.');
    }

    private function seedPurchaseMaterials(int $userId): void
    {
        /** @var PurchaseBillService $billSvc */
        $billSvc = app(PurchaseBillService::class);
        /** @var PurchaseBillJournalService $jrnSvc */
        $jrnSvc = app(PurchaseBillJournalService::class);

        if (PurchaseBill::query()->where('notes', 'like', '%PB-SNACK-BAHAN-1%')->exists()) {
            $this->command->line('   [skip] Bill bahan sudah ada.');

            return;
        }

        $bill = $billSvc->create([
            'purchase_date' => '2026-05-03',
            'due_date' => '2026-05-10',
            'supplier_name' => 'Toko Bahan Kue & Plastik',
            'status' => 'draft',
            'notes' => 'PB-SNACK-BAHAN-1 — Dibayar tunai dari modal sendiri (batch 23 pack)',
            'items' => [
                ['description' => 'Telur ayam negeri (1 kg)', 'quantity' => 1, 'unit_price' => 25_000, 'tax_percent' => 0],
                ['description' => 'Tepung ketan Rosebrand (1,5 kg)', 'quantity' => 1.5, 'unit_price' => 40_000, 'tax_percent' => 0],
                ['description' => 'Masako ayam (per sachet)', 'quantity' => 6, 'unit_price' => 500, 'tax_percent' => 0],
                ['description' => 'Plastik kemasan kecil (per pcs)', 'quantity' => 23, 'unit_price' => 660, 'tax_percent' => 0],
                ['description' => 'Minyak goreng Sunco (per liter)', 'quantity' => 2, 'unit_price' => 22_000, 'tax_percent' => 0],
                ['description' => 'Margarin Blue Band (1 pcs)', 'quantity' => 1, 'unit_price' => 2_000, 'tax_percent' => 0],
            ],
        ], $userId);

        $jrnSvc->postPaid($bill, $userId);

        $subtotal = (float) $bill->fresh()->subtotal;
        if (abs($subtotal - self::MATERIAL_TOTAL) > 0.01) {
            $this->command->warn('   ⚠ Subtotal bill bahan tidak sama MATERIAL_TOTAL.');
        }

        $this->command->line('   ✓ Pembelian bahan lunas Rp '.number_format(self::MATERIAL_TOTAL, 0, ',', '.').'.');
    }

    private function seedOperationalBatchCosts(int $userId): void
    {
        /** @var ExpenseService $expSvc */
        $expSvc = app(ExpenseService::class);
        /** @var ExpenseJournalService $jrnSvc */
        $jrnSvc = app(ExpenseJournalService::class);

        $rows = [
            [
                'expense_date' => '2026-05-04',
                'category' => 'Gaji & Upah',
                'payee_name' => 'Bantuan produksi harian',
                'description' => 'Tenaga kerja batch 23 pack — dibayar dari kas modal sendiri',
                'subtotal' => self::OPS_LABOR,
                'tax_percent' => 0,
                'reference' => 'SNACK-OPS-TK-001',
                'pay' => true,
            ],
            [
                'expense_date' => '2026-05-04',
                'category' => 'Listrik',
                'payee_name' => 'PLN / gas',
                'description' => 'Gas elpiji / listrik dapur — proporsi batch 23 pack',
                'subtotal' => self::OPS_UTILITIES,
                'tax_percent' => 0,
                'reference' => 'SNACK-OPS-GL-001',
                'pay' => true,
            ],
            [
                'expense_date' => '2026-05-04',
                'category' => 'Transportasi',
                'payee_name' => null,
                'description' => 'Transport belanja / kirim — batch 23 pack',
                'subtotal' => self::OPS_TRANSPORT,
                'tax_percent' => 0,
                'reference' => 'SNACK-OPS-TR-001',
                'pay' => true,
            ],
        ];

        foreach ($rows as $data) {
            if (Expense::query()->where('reference', $data['reference'])->exists()) {
                continue;
            }
            $pay = $data['pay'];
            unset($data['pay']);
            $expense = $expSvc->create($data, $userId);
            if ($pay) {
                $jrnSvc->postPaid($expense, $userId);
            }
        }

        $ops = self::OPS_LABOR + self::OPS_UTILITIES + self::OPS_TRANSPORT;
        $this->command->line('   ✓ Biaya ops batch Rp '.number_format($ops, 0, ',', '.').' (lunas).');
    }

    private function seedFinishedGoodsInventory(int $userId): void
    {
        /** @var InventoryStockService $stockSvc */
        $stockSvc = app(InventoryStockService::class);

        $notes = 'Batch 23 pack. HPP bahan ~Rp 6.500/pack; + ops ~Rp 7.900/pack. Referensi harga: Rp 8.500 / 10.000 / 13.000 — seed pakai jual Rp 13.000/pack.';

        $item = InventoryItem::firstOrCreate(
            ['sku' => 'SNK-SADJI-001'],
            [
                'name' => 'Makanan ringan homemade (pack)',
                'unit' => 'pack',
                'quantity_on_hand' => 0,
                'reorder_level' => 10,
                'notes' => $notes,
            ]
        );

        if ((float) $item->fresh()->quantity_on_hand > 0) {
            $this->command->line('   [skip] Stok produk jadi sudah ada.');

            return;
        }

        $stockSvc->recordMovement($item->fresh(), [
            'type' => 'in',
            'quantity' => self::PACK_OUTPUT,
            'note' => 'Hasil produksi batch 1 — '.$notes,
        ], $userId);

        $this->command->line('   ✓ '.self::PACK_OUTPUT.' pack masuk inventori.');
    }

    private function seedInvoices(int $userId): void
    {
        /** @var InvoiceService $invSvc */
        $invSvc = app(InvoiceService::class);
        /** @var InvoiceJournalService $jrnSvc */
        $jrnSvc = app(InvoiceJournalService::class);

        if (! Invoice::query()->where('notes', 'like', '%INV-SNACK-BATCH1-LUNAS%')->exists()) {
            $paid = $invSvc->create([
                'invoice_date' => '2026-05-06',
                'due_date' => '2026-05-07',
                'customer_name' => 'Warung Berkah Maju',
                'status' => 'draft',
                'notes' => 'INV-SNACK-BATCH1-LUNAS — Full batch 23 pack × Rp '.number_format(self::UNIT_PRICE_MAIN, 0, ',', '.').' (tier untung besar vs HPP bahan)',
                'items' => [
                    ['description' => 'Makanan ringan homemade — pack (SKU SNK-SADJI-001)', 'quantity' => self::PACK_OUTPUT, 'unit_price' => self::UNIT_PRICE_MAIN, 'tax_percent' => 0],
                ],
            ], $userId);
            $jrnSvc->postPaid($paid, $userId);

            $product = InventoryItem::query()->where('sku', 'SNK-SADJI-001')->first();
            if ($product && (float) $product->fresh()->quantity_on_hand >= self::PACK_OUTPUT) {
                app(InventoryStockService::class)->recordMovement($product->fresh(), [
                    'type' => 'out',
                    'quantity' => self::PACK_OUTPUT,
                    'note' => 'Penjualan batch 1 lunas — '.self::PACK_OUTPUT.' pack',
                ], $userId);
            }

            $this->command->line('   ✓ Invoice lunas — pendapatan Rp '.number_format(self::REVENUE_PAID, 0, ',', '.').'.');
        }

        if (! Invoice::query()->where('notes', 'like', '%INV-SNACK-DRAFT-TIER-8500%')->exists()) {
            $invSvc->create([
                'invoice_date' => '2026-05-07',
                'due_date' => '2026-05-14',
                'customer_name' => 'Kafe Pinggir Jalan',
                'status' => 'draft',
                'notes' => 'INV-SNACK-DRAFT-TIER-8500 — Perbandingan kuotasi tier lebih rendah (belum dibayar)',
                'items' => [
                    ['description' => 'Makanan ringan homemade — pack (alternatif Rp 8.500)', 'quantity' => 40, 'unit_price' => 8_500, 'tax_percent' => 0],
                ],
            ], $userId);
            $this->command->line('   ✓ Invoice draft perbandingan Rp 8.500/pack.');
        }
    }

    private function seedClosingEntry(int $userId): void
    {
        if (JournalEntry::query()->where('reference', self::CLOSING_REF)->exists()) {
            $this->command->line('   [skip] Jurnal penutup snack sudah ada.');

            return;
        }

        $pendapatan = $this->acc('4-4100');
        $bpp = $this->acc('5-5100');
        $bebanOps = $this->acc('5-5200');
        $modal = $this->acc('3-3100');

        $totalRevenue = self::REVENUE_PAID;
        $totalCogs = self::COGS_PURCHASES;
        $totalOperasional = self::OPS_LABOR + self::OPS_UTILITIES + self::OPS_TRANSPORT;
        $labaBersih = $totalRevenue - $totalCogs - $totalOperasional;

        /** @var JournalEntryService $svc */
        $svc = app(JournalEntryService::class);

        $entry = $svc->createDraft([
            'entry_date' => '2026-05-31',
            'reference' => self::CLOSING_REF,
            'description' => 'Penutup — Sadji Solo Snack (modal sendiri): pendapatan batch vs BPP bahan + beban ops',
            'lines' => [
                ['account_id' => $pendapatan->id, 'debit' => $totalRevenue, 'credit' => 0, 'description' => 'Tutup Pendapatan Penjualan'],
                ['account_id' => $bpp->id, 'debit' => 0, 'credit' => $totalCogs, 'description' => 'Tutup Beban Pokok Penjualan (bahan)'],
                ['account_id' => $bebanOps->id, 'debit' => 0, 'credit' => $totalOperasional, 'description' => 'Tutup Beban Operasional (batch)'],
                ['account_id' => $modal->id, 'debit' => 0, 'credit' => $labaBersih, 'description' => 'Laba bersih batch → menambah Modal pemilik'],
            ],
        ], $userId);

        $svc->post($entry);

        $this->command->line(sprintf(
            '   ✓ Jurnal penutup: laba bersih Rp %s ke Modal (estimasi vs bahan Rp %s).',
            number_format($labaBersih, 0, ',', '.'),
            number_format($totalRevenue - $totalCogs, 0, ',', '.')
        ));
    }

    private function acc(string $code): Account
    {
        return Account::query()->where('code', $code)->firstOrFail();
    }
}
