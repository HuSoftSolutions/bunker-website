import { useEffect, useState } from "react";
import Firebase from "@/lib/firebase/client";
import { type DocumentData } from "firebase/firestore";

type NoticeMessage = {
  showNoticeMsg?: boolean;
  title?: string;
  message?: string;
  link?: string;
  linkText?: string;
  [key: string]: any;
};

type InfoModalData = {
  showInfoModal?: boolean;
  showConfetti?: boolean;
  alertMsg?: string;
  title?: string;
  msg?: string;
  message?: string;
  link?: string;
  linkText?: string;
  link2?: string;
  linkText2?: string;
  [key: string]: any;
};

type NoticeInfo = {
  noticeMsg?: NoticeMessage;
  infoModal?: InfoModalData;
};

const normalizeInfoModal = (value: unknown): InfoModalData | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const raw = value as Record<string, any>;
  const normalizedMessage =
    typeof raw.msg === "string"
      ? raw.msg
      : typeof raw.message === "string"
        ? raw.message
        : undefined;

  return {
    ...raw,
    msg: normalizedMessage,
    showInfoModal: Boolean(
      raw.showInfoModal ?? raw.show ?? raw.showModal ?? raw.enabled,
    ),
    showConfetti: raw.showConfetti === true,
  };
};

const normalizeNoticeMsg = (value: unknown): NoticeMessage | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const raw = value as Record<string, any>;
  const normalizedMessage =
    typeof raw.message === "string"
      ? raw.message
      : typeof raw.msg === "string"
        ? raw.msg
        : undefined;

  return {
    ...raw,
    message: normalizedMessage,
    showNoticeMsg: Boolean(raw.showNoticeMsg ?? raw.show ?? raw.enabled),
  };
};

const normalizeNoticeInfo = (data: DocumentData | null): NoticeInfo => ({
  noticeMsg: normalizeNoticeMsg(data?.noticeMsg),
  infoModal: normalizeInfoModal(data?.infoModal),
});

const useNoticeInfo = (firebase: Firebase) => {
  const [noticeInfo, setNoticeInfo] = useState<NoticeInfo>({});

  const setShowInfoModal = (value: boolean) => {
    setNoticeInfo((prev) => ({
      ...prev,
      infoModal: {
        ...(prev?.infoModal ?? {}),
        showInfoModal: value,
      },
    }));
  };

  useEffect(() => {
    const unsubscribe = firebase.noticeInfoListener((data) => {
      setNoticeInfo(normalizeNoticeInfo(data));
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
