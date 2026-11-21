export function redactSecrets(text: string): string {
  const secrets = Object.entries(process.env)
    .filter(
      ([name, value]) =>
        Boolean(value) &&
        /PASSWORD|PASS|SECRET|TOKEN|API[_-]?KEY|USERNAME|EMAIL/i.test(name),
    )
    .map(([, value]) => value!)
    .sort((a, b) => b.length - a.length)

  return secrets.reduce(
    (result, secret) => result.replaceAll(secret, '[REDACTED]'),
    text,
  )
}