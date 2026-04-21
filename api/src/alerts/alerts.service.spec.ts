import { AlertsService } from './alerts.service';

type FetchMock = jest.Mock<Promise<{ ok: boolean; status?: number; text?: () => Promise<string> }>, [string, any]>;

describe('AlertsService', () => {
  let service: AlertsService;
  let fetchMock: FetchMock;

  beforeEach(() => {
    service = new AlertsService();
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' });
    (global as any).fetch = fetchMock;
    delete process.env.BREVO_API_KEY;
    delete process.env.ALERT_EMAIL_TO;
    delete process.env.ALERT_EMAIL_FROM;
  });

  afterEach(() => jest.restoreAllMocks());

  it('is a silent no-op when BREVO_API_KEY is unset (safe default for dev + pre-activation prod)', async () => {
    await service.notifyCaptureAlarm('alarm', 'some message');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs to Brevo with sender + recipient + message body when BREVO_API_KEY is set', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-test';
    process.env.ALERT_EMAIL_TO = 'ops@example.com';
    process.env.ALERT_EMAIL_FROM = 'alerts@example.com';
    await service.notifyCaptureAlarm('alarm', 'Capture over 90min');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.method).toBe('POST');
    expect(init.headers['api-key']).toBe('xkeysib-test');
    expect(init.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body);
    expect(body.sender.email).toBe('alerts@example.com');
    expect(body.to[0].email).toBe('ops@example.com');
    expect(body.subject).toContain('[ALARM]');
    expect(body.textContent).toBe('Capture over 90min');
    expect(body.htmlContent).toContain('Capture over 90min');
  });

  it('uses [CRITICAL] subject prefix for critical level', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-test';
    await service.notifyCaptureAlarm('critical', 'msg');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.subject).toContain('[CRITICAL]');
  });

  it('HTML-escapes user content so message text cannot break out of the <pre> block', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-test';
    await service.notifyCaptureAlarm('alarm', '<script>alert("xss")</script>');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.htmlContent).not.toContain('<script>');
    expect(body.htmlContent).toContain('&lt;script&gt;');
  });

  it('dedups within the 4h window per level — second same-level alarm is suppressed', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-test';
    await service.notifyCaptureAlarm('alarm', 'first');
    await service.notifyCaptureAlarm('alarm', 'second');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('lets a different level through even inside the dedup window — alarm and critical dedup independently', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-test';
    await service.notifyCaptureAlarm('alarm', 'first');
    await service.notifyCaptureAlarm('critical', 'upgraded');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not persist the timestamp on a failed send — next attempt is still allowed', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-test';
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'server err' });
    await service.notifyCaptureAlarm('alarm', 'first (fails)');
    await service.notifyCaptureAlarm('alarm', 'retry (succeeds)');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('swallows fetch throws (network partition etc.) — capture flow is not affected', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-test';
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(service.notifyCaptureAlarm('alarm', 'msg')).resolves.toBeUndefined();
  });

  it('falls back to default TO address when ALERT_EMAIL_TO is unset', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-test';
    await service.notifyCaptureAlarm('alarm', 'msg');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to[0].email).toBe('suess.ralf@posteo.de');
  });
});
