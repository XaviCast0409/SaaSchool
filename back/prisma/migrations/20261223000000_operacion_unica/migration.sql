-- Un número de operación (Yape, Plin, transferencia...) no puede repetirse entre cobros activos del mismo
-- colegio y medio de pago. La validación del servicio no bastaba: dos cobros simultáneos de cuotas
-- distintas podían pasar los dos. Índice parcial (Prisma no los declara en el schema: se mantiene aquí).
CREATE UNIQUE INDEX "PaymentTransaction_active_operation_key"
  ON "PaymentTransaction" ("schoolId", "paymentMethod", "operationNumber")
  WHERE "status" = 'ACTIVE' AND "operationNumber" IS NOT NULL AND "paymentMethod" <> 'CASH';
