'use client';

import { useState } from 'react';
import { SubmitButton } from '@/components/submit-button';
import { businessCardMaxBytes } from '@/lib/profile/business-card';

export function BusinessCardForm({ action }: { action: (form: FormData) => void | Promise<void> }) {
  const [message, setMessage] = useState('');
  return <form action={action} className="business-card-form" onSubmit={event => {
    const file = new FormData(event.currentTarget).get('business_card');
    if (!(file instanceof File) || !file.size || file.size > businessCardMaxBytes || !['image/jpeg', 'image/png'].includes(file.type)) {
      event.preventDefault();
      setMessage('JPG 또는 PNG 이미지를 3MB 이하로 선택해 주세요.');
    } else setMessage('');
  }}>
    <label htmlFor="business-card">명함 이미지</label>
    <input id="business-card" name="business_card" type="file" accept="image/jpeg,image/png" required onChange={() => setMessage('')}/>
    <p>JPG 또는 PNG · 최대 3MB. 제출한 명함은 인증 검토 목적으로 사용됩니다.</p>
    {message && <p className="profile-notice profile-notice-error" role="alert">{message}</p>}
    <SubmitButton pendingLabel="제출 중...">인증 검토 요청</SubmitButton>
  </form>;
}
