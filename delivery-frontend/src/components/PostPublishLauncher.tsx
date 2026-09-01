import { message } from 'antd';
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { useNavigate } from 'umi';
import { useShop } from '@/app/ShopContext';
import { stagePostPublishFiles } from '@/utils/postPublishDraft';
import { buildLoginPath } from '@/utils/safeRedirect';

type StartPostPublishOptions = {
  placeId?: number;
};

type PostPublishLauncherValue = {
  startPostPublish: (options?: StartPostPublishOptions) => void;
};

const PostPublishLauncherContext = createContext<PostPublishLauncherValue | null>(null);

function publishPath(options?: StartPostPublishOptions) {
  if (!options?.placeId) return '/posts/publish';
  return `/posts/publish?placeId=${options.placeId}`;
}

export function PostPublishLauncherProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user } = useShop();
  const inputRef = useRef<HTMLInputElement>(null);
  const targetPathRef = useRef('/posts/publish');

  const startPostPublish = useCallback((options?: StartPostPublishOptions) => {
    const targetPath = publishPath(options);
    if (!user) {
      message.info('登录后才能发布甄客帖');
      navigate(buildLoginPath(targetPath));
      return;
    }
    targetPathRef.current = targetPath;
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  }, [navigate, user]);

  const handleFilesSelected = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    stagePostPublishFiles(files);
    navigate(targetPathRef.current);
  }, [navigate]);

  return (
    <PostPublishLauncherContext.Provider value={{ startPostPublish }}>
      {children}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,video/mp4"
        multiple
        hidden
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFilesSelected}
      />
    </PostPublishLauncherContext.Provider>
  );
}

export function usePostPublishLauncher() {
  const value = useContext(PostPublishLauncherContext);
  if (!value) throw new Error('usePostPublishLauncher 必须在 PostPublishLauncherProvider 内使用');
  return value;
}
