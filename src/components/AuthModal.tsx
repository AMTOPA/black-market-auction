"use client";

import { useState, type FormEvent } from "react";
import { apiLogin, apiRegister, type AuthUser } from "@/lib/api";

type AuthMode = "login" | "register";

export interface AuthModalProps {
  onClose: () => void;
  onAuthed: (user: AuthUser) => void;
}

export default function AuthModal({ onClose, onAuthed }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const name = username.trim();
    if (!name || !password) {
      setError("请交出完整的身份暗号与口令。");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError("两次口令不一致，请重新确认。");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response =
        mode === "login" ? await apiLogin(name, password) : await apiRegister(name, password);
      onAuthed(response.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "暗号传递失败，请稍后再试。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="modal-title" id="auth-modal-title">
        ◆ 买家身份册 ◆
      </div>
      <div className="tabs" role="tablist" aria-label="身份验证方式">
        <button
          className={`tab ${mode === "login" ? "active" : ""}`}
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          onClick={() => switchMode("login")}
        >
          登录
        </button>
        <button
          className={`tab ${mode === "register" ? "active" : ""}`}
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          onClick={() => switchMode("register")}
        >
          注册
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="auth-username">
          买家代号
        </label>
        <input
          className="input"
          id="auth-username"
          name="username"
          type="text"
          autoComplete="username"
          minLength={2}
          maxLength={16}
          placeholder="2-16 位字母、数字、下划线或中文"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          disabled={submitting}
          autoFocus
        />

        <br />
        <label className="field-label" htmlFor="auth-password">
          私人口令
        </label>
        <input
          className="input"
          id="auth-password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "register" ? 6 : undefined}
          maxLength={64}
          placeholder={mode === "register" ? "至少 6 位，仅由你掌握" : "输入你的口令"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={submitting}
        />

        {mode === "register" && (
          <>
            <br />
            <label className="field-label" htmlFor="auth-password-confirm">
              再次确认口令
            </label>
            <input
              className="input"
              id="auth-password-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={6}
              maxLength={64}
              placeholder="再次输入口令"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={submitting}
            />
          </>
        )}

        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}

        <br />
        <button className="btn btn-gold btn-lg btn-block" type="submit" disabled={submitting}>
          {submitting ? "正在核验暗号……" : mode === "login" ? "进入拍卖行" : "写入身份册"}
        </button>
      </form>

      <div className="btn-row">
        <button className="btn btn-sm btn-block" type="button" onClick={onClose} disabled={submitting}>
          暂不留名
        </button>
      </div>
      <p className="center faint tiny">拍卖行只认代号，不问真实姓名。</p>
    </div>
  );
}
