-- Test-only settings so the rolled-back SQL tests in scripts/ can create orders.
-- The receiver values match the public QR image in assets/payments/.
update private.payment_settings set
  enabled = true,
  bank = 'ธนาคารกสิกรไทย',
  account_number = '0248522232',
  recipient_name = 'MapleThai test receiver',
  qr_path = 'assets/payments/kbank-0248522232.jpeg',
  qr_payload = '00020101021129390016A000000677010111031500499900465145053037645802TH6304BF03'
where id;
insert into vault.secrets(name, secret) values ('maplethai_easyslip_api_key', 'test-only') on conflict (name) do nothing;
