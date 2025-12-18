import { useEffect, useState } from "react";
import Firebase from "@/lib/firebase/client";

type NoticeInfo = Record<string, any>;

const useNoticeInfo = (firebase: Firebase) => {
  const [noticeInfo, setNoticeInfo] = useState<NoticeInfo>({});

  const setShowInfoModal = (value: boolean) => {
    setNoticeInfo((prev) => ({
      ...prev,
      infoModal: {
        ...prev.infoModal,
        showInfoModal: value,
      },
    }));
  };

  useEffect(() => {
    const unsubscribe = firebase.noticeInfoListener((data) => {
      setNoticeInfo(data);
    });

    return () => {
      unsubscribe();
    };
  }, [firebase]);

  return {
    noticeInfo,
    setShowInfoModal,
  };
};

export default useNoticeInfo;
