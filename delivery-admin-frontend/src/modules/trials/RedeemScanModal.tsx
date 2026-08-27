import { Button, Input, Modal, Space, Spin, message } from 'antd';
import { Html5Qrcode } from 'html5-qrcode';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from '@/pages/index.less';

const REDEEM_CODE_PATTERN = /^(?:[0-9a-f]{32}|CP[0-9a-f]{32})$/i;
const QR_READER_ID = 'redeem-qr-reader';

function describeCameraError(error: unknown) {
  const name = error instanceof DOMException ? error.name : (error as Error)?.name;
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return '摄像头权限被拒绝，请在浏览器地址栏允许摄像头权限后重试';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return '未检测到可用摄像头，请连接摄像头，或改用图片识别 / 手动输入核销码';
    case 'NotReadableError':
    case 'TrackStartError':
      return '摄像头正被其他应用占用，请关闭占用摄像头的程序后重试';
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return '摄像头不支持当前调用方式，自动尝试其他配置后仍失败';
    default:
      return '无法访问摄像头，请允许摄像头权限，或改用图片识别 / 手动输入核销码';
  }
}

export interface RedeemScanModalProps {
  open: boolean;
  redeeming: boolean;
  onClose: () => void;
  onRecognized: (redeemCode: string) => Promise<void>;
  title?: string;
  description?: string;
}

export default function RedeemScanModal({
  open,
  redeeming,
  onClose,
  onRecognized,
  title = '线下试用核销',
  description = '对准用户出示的核销码，识别成功后先核对信息，再确认核销。',
}: RedeemScanModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const busyRef = useRef(false);
  const openRef = useRef(open);
  openRef.current = open;
  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState('');
  const [camStopped, setCamStopped] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setCamReady(false);
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      // 忽略停止异常，相机可能已释放
    }
    scanner.clear();
  }, []);

  const startScanner = useCallback(async () => {
    await stopScanner();
    const element = document.getElementById(QR_READER_ID);
    if (!element) {
      setCamError('二维码扫码区域未就绪');
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCamError('当前页面不在 HTTPS（或 localhost）下，浏览器禁止调用摄像头；请改用图片识别 / 手动输入核销码');
      return;
    }
    setCamError('');
    setCamStopped(false);
    setCamReady(false);

    const handleDecode = (decodedText: string) => {
      const code = decodedText.trim();
      if (!REDEEM_CODE_PATTERN.test(code)) return;
      if (busyRef.current) return;
      busyRef.current = true;
      void (async () => {
        await stopScanner();
        setCamStopped(true);
        try {
          await onRecognized(code);
        } catch {
          // 父级已提示错误，展示重试入口
        } finally {
          busyRef.current = false;
        }
      })();
    };

    // 设备枚举优先指定后摄；枚举失败（如权限未授予）再按 facingMode 依次尝试后摄/前摄
    const cameraConfigs: Array<{ facingMode?: 'environment' | 'user'; deviceId?: { exact: string } }> = [];
    try {
      const cameras = await Html5Qrcode.getCameras();
      if (cameras.length > 0) {
        const back = cameras.find((c) => /back|rear|环境|后置/i.test(c.label ?? ''));
        cameraConfigs.push({ deviceId: { exact: (back ?? cameras[0]).id } });
      }
    } catch {
      // 忽略枚举失败，继续走 facingMode 回退
    }
    cameraConfigs.push({ facingMode: 'environment' }, { facingMode: 'user' });

    let lastError: unknown = null;
    for (const config of cameraConfigs) {
      element.replaceChildren();
      const scanner = new Html5Qrcode(QR_READER_ID);
      scannerRef.current = scanner;
      try {
        await scanner.start(config, { fps: 10, qrbox: { width: 250, height: 250 } }, handleDecode, () => {});
        setCamReady(true);
        return;
      } catch (error) {
        lastError = error;
        scannerRef.current = null;
        try {
          scanner.clear();
        } catch {
          // 忽略清理异常
        }
      }
    }
    setCamError(describeCameraError(lastError));
  }, [onRecognized, stopScanner]);

  useEffect(() => () => { void stopScanner(); }, [stopScanner]);

  const scanFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busyRef.current) return;
    busyRef.current = true;
    setFileLoading(true);
    try {
      const scanner = scannerRef.current ?? new Html5Qrcode(QR_READER_ID);
      scannerRef.current = scanner;
      const text = await scanner.scanFile(file, false);
      const code = text.trim();
      if (!REDEEM_CODE_PATTERN.test(code)) {
        throw new Error('未识别到有效的核销码');
      }
      await onRecognized(code);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '二维码识别失败');
    } finally {
      busyRef.current = false;
      setFileLoading(false);
    }
  };

  const submitManual = async () => {
    const code = manualCode.trim();
    if (!REDEEM_CODE_PATTERN.test(code)) {
      message.warning('请输入正确的核销码');
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await onRecognized(code);
    } finally {
      busyRef.current = false;
    }
  };

  const readerVisible = open && !camStopped && !camError;

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      footer={null}
      width={420}
      destroyOnHidden={false}
      afterOpenChange={(visible) => {
        if (visible) {
          // 等弹窗动画与布局完成后启动，避免容器尺寸未就绪导致 start() 失败
          window.setTimeout(() => {
            if (openRef.current) void startScanner();
          }, 80);
        } else {
          setManualCode('');
          void stopScanner();
        }
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ margin: 0, color: 'rgba(0,0,0,0.45)' }}>
          {description}
        </p>
        {open && (
          <div
            id={QR_READER_ID}
            style={{
              display: readerVisible ? 'flex' : 'none',
              width: '100%',
              justifyContent: 'center',
              background: '#f5f5f5',
              borderRadius: 8,
              overflow: 'hidden',
              minHeight: 220,
            }}
          />
        )}
        {camStopped && !camError && (
          <div style={{ textAlign: 'center', padding: 8 }}>
            {redeeming ? <Spin /> : (
              <Button type="primary" onClick={() => void startScanner()}>重新扫码</Button>
            )}
          </div>
        )}
        {camError && (
          <div style={{ textAlign: 'center', padding: 8 }}>
            <p style={{ color: '#cf1322', margin: '0 0 8px' }}>{camError}</p>
            <Button onClick={() => void startScanner()}>重试摄像头</Button>
          </div>
        )}
        <Space style={{ justifyContent: 'space-between' }}>
          <Button loading={fileLoading} onClick={() => document.getElementById('redeem-file-input')?.click()}>
            上传二维码图片
          </Button>
          <input
            id="redeem-file-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(event) => void scanFile(event)}
          />
        </Space>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="手动输入核销码"
            value={manualCode}
            maxLength={34}
            onChange={(event) => setManualCode(event.target.value)}
            onPressEnter={() => void submitManual()}
          />
          <Button onClick={() => void submitManual()}>下一步</Button>
        </div>
      </div>
    </Modal>
  );
}
