-- Add public key storage for trustees (asymmetric key wrapping approach)
-- Each trustee generates an RSA keypair at acceptance
-- Public key stored here, private key stored client-side by trustee

alter table trustees
  add column public_key_jwk text,
  add column keypair_generated_at timestamptz;

-- Add wrapped keys to asset grants
-- When owner grants asset access, the asset's encryption key is wrapped with trustee's public key
alter table asset_trustee_grants
  add column wrapped_key text;

comment on column trustees.public_key_jwk is 'Trustee RSA public key in JWK format for key wrapping';
comment on column trustees.keypair_generated_at is 'When the trustee generated their keypair (at acceptance)';
comment on column asset_trustee_grants.wrapped_key is 'Asset encryption key wrapped with trustee public key (RSA-OAEP)';
