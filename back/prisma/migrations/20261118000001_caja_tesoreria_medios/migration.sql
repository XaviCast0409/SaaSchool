-- Los vouchers Yape, Plin y depósito aprobados antes se guardaban como transferencia.
-- Ahora cada medio tiene su propio valor (va en una migración aparte porque PostgreSQL
-- no deja usar un valor de enum nuevo en la misma transacción en que se crea).
UPDATE "PaymentTransaction" t
SET "paymentMethod" = r."method"::"PaymentMethod"
FROM "PaymentReport" r
WHERE r."transactionId" = t."id" AND r."method" IN ('YAPE', 'PLIN', 'DEPOSIT');
