import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { Contact, Conversation, Message, OccurrenceType, QuickMessage, Tag, User } from '../../types';
import { EmptyState, LoadingState, Modal } from '../../components/common';
import { useToast } from '../../contexts/ToastContext';
import { applyInboundEvents, fetchEvents } from '../../services/inbound';
import { createPaymentViaBackend, listStoreCouponsViaBackend, listStoreProductsViaBackend, sendCatalogViaBackend } from '../../services/backend';
import { sendWhatsAppText } from '../../services/sendWhatsApp';

const statusLabel: Record<string, string> = {
  waiting: 'Aguardando',
  in_progress: 'Em atendimento',
  ai_handling: 'IA atendendo',
  transferred: 'Transferida',
  finished: 'Finalizada',
  reopened: 'Reaberta',
  lost: 'Perdida',
  archived: 'Arquivada',
};

const statusColor: Record<string, string> = {
  waiting: 'warning',
  in_progress: 'primary',
  ai_handling: 'info',
  transferred: 'secondary',
  finished: 'success',
  reopened: 'warning',
  lost: 'danger',
  archived: 'secondary',
};

type ChatFilter = 'all' | 'waiting' | 'in_progress' | 'ai' | 'finished' | 'fav';
type InternalNote = { text: string; createdAt: string; author: string };
type ContactExt = Contact & { customFields?: Record<string, unknown> & { internalNotes?: InternalNote[] } };
type ConversationExt = Conversation & { startedAt?: string };
type StoreProductLite = { id: string; name: string; category?: string; price: number; active?: boolean };
type StoreCouponLite = { id: string; code: string; type: 'percent' | 'fixed'; value: number; active: boolean };
type ChannelLite = { id: string; type?: string; credentials?: { instanceName?: string; phoneNumberId?: string; accessToken?: string; catalogId?: string } };

const filterLabel: Record<ChatFilter, string> = {
  all: 'Todas',
  waiting: 'Aguardando',
  in_progress: 'Atendendo',
  ai: 'IA',
  finished: 'Finalizadas',
  fav: 'Favoritas',
};

export default function Chat() {
  const { notify } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [convs, setConvs] = useState<ConversationExt[]>([]);
  const [sel, setSel] = useState<ConversationExt | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [search, setSearch] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [chatFilterOpen, setChatFilterOpen] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [occTypes, setOccTypes] = useState<OccurrenceType[]>([]);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quick, setQuick] = useState<QuickMessage[]>([]);
  const [notifBlink, setNotifBlink] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [products, setProducts] = useState<StoreProductLite[]>([]);
  const [coupons, setCoupons] = useState<StoreCouponLite[]>([]);
  const [productCouponOpen, setProductCouponOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StoreProductLite | null>(null);
  const [selectedCouponId, setSelectedCouponId] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifCfg, setNotifCfg] = useState(() => {
    try {
      const raw = localStorage.getItem('chat_notification_settings');
      if (raw) return JSON.parse(raw) as { enabled: boolean; sound: 'beep' | 'chime' | 'ping'; volume: number; intervalSec: number };
    } catch {
      // ignore
    }
    return { enabled: true, sound: 'chime' as const, volume: 0.7, intervalSec: 8 };
  });
  const endRef = useRef<HTMLDivElement>(null);
  const lastAudioAtRef = useRef(0);
  const allTags = (JSON.parse(localStorage.getItem('db_tags') || '[]') as Tag[]) || [];

  useEffect(() => {
    (async () => {
      const [c, u, o, q] = await Promise.all([api.conversations.list(), api.settings.getUsers(), api.occurrenceTypes.list(), api.quickMessages.list()]);
      setConvs(c as ConversationExt[]);
      setUsers(u as User[]);
      setOccTypes((o as OccurrenceType[]).filter((x) => !x.isDeleted));
      setQuick(q as QuickMessage[]);
      try {
        const [backendProducts, backendCoupons] = await Promise.all([
          listStoreProductsViaBackend(),
          listStoreCouponsViaBackend(),
        ]);
        setProducts(backendProducts.ok ? backendProducts.products : []);
        setCoupons(backendCoupons.ok ? backendCoupons.coupons : []);
      } catch {
        setProducts([]);
        setCoupons([]);
      }
      setLoading(false);

      const state = location.state as { conversationId?: string } | null;
      if (state?.conversationId) {
        const initial = (c as ConversationExt[]).find((x) => x.id === state.conversationId) || null;
        if (initial) setSel(initial);
      }
    })();
  }, [location.state]);

  useEffect(() => {
    api.auth.getCurrentUser().then((u) => setCurrentUser((u || null) as User | null));
  }, []);

  useEffect(() => {
    if (!sel) return;
    api.conversations.getMessages(sel.id).then((m) => setMsgs(m as Message[]));
  }, [sel]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  useEffect(() => {
    let alive = true;
    let iv: ReturnType<typeof setInterval> | undefined;
    let since = 0;
    const tick = async () => {
      const res = await fetchEvents(since);
      if (!res || !alive) return;
      since = res.now;
      if (res.events.length) {
        const { conversations, changed } = applyInboundEvents(res.events);
        if (changed && alive) {
          const nextConvs = conversations as ConversationExt[];
          setConvs(nextConvs);
          setSel((cur) => (cur ? nextConvs.find((x) => x.id === cur.id) || cur : cur));
          const hasAnyIncoming = res.events.some((e) => e.direction === 'in');
          const now = Date.now();
          const canPlay = now - lastAudioAtRef.current >= Math.max(1, notifCfg.intervalSec) * 1000;
          if (notifCfg.enabled && hasAnyIncoming && canPlay) {
            playNotification(notifCfg.sound, notifCfg.volume);
            lastAudioAtRef.current = now;
            setNotifBlink(true);
            setTimeout(() => setNotifBlink(false), 1800);
          }
        }
      }
    };
    (async () => {
      await Promise.all([api.contacts.list(), api.conversations.list()]).catch(() => {});
      if (!alive) return;
      await tick();
      iv = setInterval(tick, 4000);
    })();
    return () => {
      alive = false;
      if (iv) clearInterval(iv);
    };
  }, [currentUser?.id, notifCfg.enabled, notifCfg.intervalSec, notifCfg.sound, notifCfg.volume]);

  useEffect(() => {
    localStorage.setItem('chat_notification_settings', JSON.stringify(notifCfg));
  }, [notifCfg]);

  const selectedContact = (sel?.contact || null) as ContactExt | null;
  const noteList = (selectedContact?.customFields?.internalNotes || []) as InternalNote[];
  const visibleNotes = notesExpanded ? noteList : noteList.slice(0, 2);

  const filtered = convs.filter((c) => {
    if (filter === 'waiting' && c.status !== 'waiting') return false;
    if (filter === 'in_progress' && c.status !== 'in_progress') return false;
    if (filter === 'ai' && !c.isAI) return false;
    if (filter === 'finished' && c.status !== 'finished') return false;
    if (filter === 'fav' && !c.isFavorite) return false;
    if (search && !c.contact.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function playNotification(sound: 'beep' | 'chime' | 'ping', volume: number) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const tone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), now + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    };
    if (sound === 'beep') {
      tone(820, 0, 0.14);
    } else if (sound === 'ping') {
      tone(980, 0, 0.1);
      tone(1280, 0.12, 0.1);
    } else {
      tone(720, 0, 0.12);
      tone(980, 0.15, 0.12);
      tone(1240, 0.3, 0.12);
    }
    setTimeout(() => {
      void ctx.close();
    }, 900);
  }

  const send = async () => {
    if (!text.trim() || !sel) return;
    try {
      const real = await sendWhatsAppText(sel, text.trim());
      if (real) {
        await api.conversations.sendMessage(sel.id, { content: real.content, senderType: 'user', type: 'text' });
        setMsgs((p) => [...p, real]);
        setConvs((p) => [{ ...sel, lastMessage: real, updatedAt: new Date().toISOString() }, ...p.filter((c) => c.id !== sel.id)]);
      } else {
        const m = await api.conversations.sendMessage(sel.id, { content: text.trim(), senderType: 'user', type: 'text' });
        setMsgs((p) => [...p, m as Message]);
      }
      setText('');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao enviar mensagem pelo WhatsApp';
      notify(message, 'error');
    }
  };

  const getActiveInstanceName = () => {
    if (!sel) return '';
    const channels = (JSON.parse(localStorage.getItem('db_channels') || '[]') as ChannelLite[]);
    const ch = channels.find((c) => c.id === sel.channelId);
    // For Meta Cloud API channels, return the phoneNumberId as identifier
    if (ch?.type === 'whatsapp_official' && ch?.credentials?.phoneNumberId) return ch.credentials.phoneNumberId;
    return ch?.credentials?.instanceName || '';
  };

  const getActiveChannel = (): ChannelLite | undefined => {
    if (!sel) return undefined;
    const channels = (JSON.parse(localStorage.getItem('db_channels') || '[]') as ChannelLite[]);
    return channels.find((c) => c.id === sel.channelId);
  };

  const sendCatalog = async () => {
    if (!sel) return;
    const activeChannel = getActiveChannel();
    const instanceName = getActiveInstanceName();
    if (!instanceName) {
      notify('Canal sem instância vinculada', 'warning');
      return;
    }
    const number = (sel.contact.phone || '').replace(/\D/g, '');
    const activeProducts = products.filter((p) => p.active).slice(0, 20);

    // Meta Cloud API - send catalog text message
    if (activeChannel?.type === 'whatsapp_official' && activeChannel?.credentials?.accessToken) {
      try {
        const { sendText } = await import('../../services/meta-cloud');
        const lines = ['🛍️ *Catálogo de Produtos*', ...activeProducts.map((p, i) => `${i+1}. ${p.name} - R$ ${Number(p.price||0).toLocaleString('pt-BR')}`), '', 'Responda com o número do item para comprar.'];
        const sent = await sendText(activeChannel.credentials as any, number, lines.join('\n'));
        if (sent) { notify('Catálogo enviado via WhatsApp Oficial'); return; }
      } catch { /* fallback */ }
    }

    const res = await sendCatalogViaBackend({ instanceName, number, products: activeProducts });
    if (!res?.ok) {
      notify(res?.error || 'Falha ao enviar catálogo', 'error');
      return;
    }
    notify('Catálogo enviado no WhatsApp');
  };

  const sendProductPayment = async (p: StoreProductLite, method: 'PIX' | 'CARD', coupon?: StoreCouponLite | null) => {
    if (!sel) return;
    const activeChannel = getActiveChannel();
    const instanceName = getActiveInstanceName();
    if (!instanceName) {
      notify('Canal sem instância vinculada. Configure as credenciais em Conexões.', 'warning');
      return;
    }
    const number = (sel.contact.phone || '').replace(/\D/g, '');
    const basePrice = Number(p.price || 0);
    const discountAmount = coupon ? Math.min(basePrice, coupon.type === 'percent' ? Number((basePrice * (coupon.value / 100)).toFixed(2)) : Number(coupon.value || 0)) : 0;
    const finalAmount = Math.max(0, Number((basePrice - discountAmount).toFixed(2)));

    // Meta Cloud API - send PIX payment natively via WhatsApp
    if (activeChannel?.type === 'whatsapp_official' && activeChannel?.credentials?.phoneNumberId && activeChannel?.credentials?.accessToken) {
      try {
        const { sendPixPayment } = await import('../../services/meta-cloud');
        const sent = await sendPixPayment(activeChannel.credentials as any, number, {
          productName: p.name,
          amount: finalAmount,
          pixCopyPaste: '', // Will be filled if Asaas is configured
          invoiceUrl: '',
        });
        if (sent) {
          notify(`Cobrança PIX enviada via WhatsApp Oficial para ${p.name}`);
          setProductsOpen(false); setProductCouponOpen(false); setSelectedProduct(null); setSelectedCouponId('');
          return;
        }
      } catch { /* fallback to backend */ }
    }

    // Fallback: use backend (Asaas + Evolution/Meta)
    const r = await createPaymentViaBackend({
      instanceName,
      number,
      customerName: sel.contact.name,
      productId: p.id,
      amount: finalAmount,
      originalAmount: basePrice,
      discountAmount,
      couponCode: coupon?.code || '',
      couponType: coupon?.type || '',
      couponValue: coupon?.value ?? '',
      description: coupon ? `Compra de ${p.name} com cupom ${coupon.code}` : `Compra de ${p.name}`,
      method,
      conversationId: sel.id,
      contactId: sel.contactId,
      channelId: sel.channelId,
      agentId: sel.agentId || currentUser?.id,
      agentName: users.find((u) => u.id === (sel.agentId || currentUser?.id))?.name || currentUser?.name || '',
    });
    if (!r?.ok) {
      notify(r?.error || 'Falha ao criar cobrança', 'error');
      return;
    }
    notify(`Pagamento gerado para ${p.name}`);
    setProductsOpen(false);
    setProductCouponOpen(false);
    setSelectedProduct(null);
    setSelectedCouponId('');
  };

  const deleteConversation = async () => {
    if (!sel || !(currentUser?.role === 'admin' || currentUser?.role === 'super_admin')) return;
    await api.conversations.delete(sel.id);
    setConvs((current) => current.filter((item) => item.id !== sel.id));
    setSel((current) => (current?.id === sel.id ? null : current));
    notify('Conversa excluída');
  };

  const selectedCoupon = coupons.find((item) => item.id === selectedCouponId) || null;
  const couponPreview = selectedProduct && selectedCoupon
    ? Math.min(Number(selectedProduct.price || 0), selectedCoupon.type === 'percent'
      ? Number((Number(selectedProduct.price || 0) * (selectedCoupon.value / 100)).toFixed(2))
      : Number(selectedCoupon.value || 0))
    : 0;
  const selectedProductFinalPrice = selectedProduct ? Math.max(0, Number((Number(selectedProduct.price || 0) - couponPreview).toFixed(2))) : 0;

  const toggleTag = async (tag: Tag) => {
    if (!sel) return;
    const has = sel.tags.some((t) => t.id === tag.id);
    const next = has ? sel.tags.filter((t) => t.id !== tag.id) : [...sel.tags, tag];
    setSel((s) => (s ? { ...s, tags: next } : s));
    setConvs((p) => p.map((c) => (c.id === sel.id ? { ...c, tags: next } : c)));
    await api.conversations.update(sel.id, { tags: next });
    await api.contacts.update(sel.contactId, { tags: next });
    await api.audit.log(has ? 'Tag removida' : 'Tag adicionada', 'Chat', 'Conversation', sel.id);
  };

  const toggleFavorite = async () => {
    if (!sel) return;
    const next = !sel.isFavorite;
    await api.conversations.update(sel.id, { isFavorite: next });
    setSel((s) => (s ? { ...s, isFavorite: next } : s));
    setConvs((p) => p.map((c) => (c.id === sel.id ? { ...c, isFavorite: next } : c)));
    await api.audit.log(next ? 'Conversa favoritada' : 'Conversa desfavoritada', 'Chat', 'Conversation', sel.id);
  };

  const saveNote = async () => {
    if (!sel || !selectedContact) return;
    const note = noteText.trim();
    if (!note) return;
    const me = (await api.auth.getCurrentUser()) as User | null;
    const nextNotes: InternalNote[] = [{ text: note, createdAt: new Date().toISOString(), author: me?.name || me?.email || 'Usuario' }, ...noteList];
    const updatedContact: ContactExt = {
      ...selectedContact,
      notes: note,
      customFields: { ...(selectedContact.customFields || {}), internalNotes: nextNotes },
      updatedAt: new Date().toISOString(),
    };
    setSel((s) => (s ? { ...s, contact: updatedContact } : s));
    setConvs((p) => p.map((c) => (c.id === sel.id ? { ...c, contact: updatedContact } : c)));
    await api.contacts.update(sel.contactId, { notes: note, customFields: updatedContact.customFields });
    await api.audit.log('Anotacao interna salva', 'Chat', 'Contact', sel.contactId);
    setNoteOpen(false);
    setNoteText('');
    setNotesExpanded(false);
    notify('Anotacao salva');
  };

  const doTransfer = async (uid: string) => {
    if (!sel) return;
    await api.conversations.transfer(sel.id, uid);
    await api.audit.log('Conversa transferida', 'Chat', 'Conversation', sel.id);
    setConvs((p) => p.map((c) => (c.id === sel.id ? { ...c, agentId: uid, status: 'transferred' } : c)));
    setTransferOpen(false);
    notify('Atendimento transferido');
  };

  const doFinish = async (occId: string) => {
    if (!sel) return;
    await api.conversations.update(sel.id, { status: 'finished' });
    await api.audit.log('Conversa finalizada', 'Chat', 'Conversation', sel.id, { occId });
    setConvs((p) => p.map((c) => (c.id === sel.id ? { ...c, status: 'finished' } : c)));
    setSel((s) => (s ? { ...s, status: 'finished' } : s));
    setFinishOpen(false);
    notify('Atendimento finalizado');
  };

  const toggleAI = async () => {
    if (!sel) return;
    const ns = sel.isAI ? 'in_progress' : 'ai_handling';
    await api.conversations.update(sel.id, { status: ns, isAI: !sel.isAI });
    setSel((s) => (s ? { ...s, isAI: !s.isAI, status: ns as Conversation['status'] } : s));
    setConvs((p) => p.map((c) => (c.id === sel.id ? { ...c, isAI: !c.isAI, status: ns as Conversation['status'] } : c)));
    notify(sel.isAI ? 'IA pausada - voce assumiu' : 'IA acionada na conversa');
  };

  const startHumanAttendance = async () => {
    if (!sel) return;
    const me = (await api.auth.getCurrentUser()) as User | null;
    const startedAt = sel.startedAt || new Date().toISOString();
    const patch = { status: 'in_progress' as Conversation['status'], isAI: false, agentId: me?.id, startedAt };
    await api.conversations.update(sel.id, patch);
    setSel((s) => (s ? { ...s, ...patch } : s));
    setConvs((p) => p.map((c) => (c.id === sel.id ? { ...c, ...patch } : c)));
    await api.audit.log('Atendimento humano iniciado', 'Chat', 'Conversation', sel.id);
    notify('Atendimento humano iniciado');
  };

  if (loading) return <LoadingState />;

  return (
    <div className="chat-layout">
      <div className="chat-list card">
        <div className="chat-list-head">
          <div className="flex items-center gap-1">
            <div className="search-box" style={{ flex: 1 }}>
              <i className="ti ti-search" />
              <input placeholder="Buscar conversas..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button className={`icon-btn ${notifBlink ? 'bell-pulse' : ''}`} title="Notificações" onClick={() => setNotifOpen(true)}>
              <i className="ti ti-bell" />
            </button>
          </div>
        </div>
        <div className="chat-filters">
          <button className="btn btn-light-secondary btn-sm" onClick={() => setChatFilterOpen(true)}>
            <i className="ti ti-filter" /> Filtro: {filterLabel[filter]}
          </button>
        </div>
        <div className="chat-conv-list app-scroll">
          {filtered.length === 0 ? (
            <EmptyState icon="ti ti-message-off" title="Nenhuma conversa" />
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className={`chat-conv-item ${sel?.id === c.id ? 'active' : ''}`}
                onClick={() => {
                  setSel(c);
                  setNotesExpanded(false);
                }}
              >
                <div className="avatar-sm">{c.contact.name.charAt(0)}</div>
                <div className="conv-mid">
                  <div className="conv-top">
                    <span className="conv-name">{c.contact.name}</span>
                    {c.isFavorite && <i className="ti ti-star-filled" style={{ color: '#FAAC50', fontSize: '.8rem' }} />}
                  </div>
                  <span className="conv-preview">{c.lastMessage?.content || 'Sem mensagens'}</span>
                </div>
                <div className="conv-right">
                  <span className={`badge bg-light-${statusColor[c.status]} text-${statusColor[c.status]}`}>{statusLabel[c.status]}</span>
                  <span className="conv-channel">
                    <i className="ti ti-brand-whatsapp" /> {c.channel?.name}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {sel ? (
        <div className="chat-main card">
          <div className="chat-header">
            <div className="flex items-center gap-1">
              <div className="avatar-sm">{sel.contact.name.charAt(0)}</div>
              <div>
                <div className="fw-600">{sel.contact.name}</div>
                <div className="text-xs text-muted">
                  {sel.contact.phone || sel.contact.name} - {sel.channel?.name}
                </div>
              </div>
            </div>
            <div className="chat-header-actions">
              {(sel.status === 'waiting' || sel.status === 'ai_handling' || sel.status === 'transferred') && (
                <button className="btn btn-sm btn-primary" onClick={startHumanAttendance}>
                  <i className="ti ti-player-play" /> Iniciar atendimento
                </button>
              )}
              <button className={`btn btn-sm ${sel.isAI ? 'btn-light-danger' : 'btn-light-primary'}`} onClick={toggleAI}>
                <i className="ti ti-robot" />
                {sel.isAI ? 'Pausar IA' : 'Acionar IA'}
              </button>
              <button className="icon-btn" onClick={toggleFavorite} title="Favoritar">
                <i className={sel.isFavorite ? 'ti ti-star-filled' : 'ti ti-star'} />
              </button>
              <button className="btn btn-sm btn-light-secondary" onClick={() => setQuickOpen(true)}>
                <i className="ti ti-bolt" /> Respostas
              </button>
              <button className="btn btn-sm btn-light-secondary" onClick={() => setProductsOpen(true)}>
                <i className="ti ti-shopping-bag" /> Produtos
              </button>
              <button className="btn btn-sm btn-light-secondary" onClick={() => void sendCatalog()}>
                <i className="ti ti-list-details" /> Catálogo
              </button>
              <button className="btn btn-sm btn-light-secondary" onClick={() => setTransferOpen(true)}>
                <i className="ti ti-arrows-transfer-down" /> Transferir
              </button>
              <button className="btn btn-sm btn-success" onClick={() => setFinishOpen(true)}>
                <i className="ti ti-check" /> Finalizar
              </button>
              {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
                <button className="btn btn-sm btn-light-danger" onClick={() => void deleteConversation()}>
                  <i className="ti ti-trash" /> Excluir conversa
                </button>
              )}
              <button className="icon-btn" onClick={() => setShowInfo((s) => !s)}>
                <i className="ti ti-info-circle" />
              </button>
            </div>
          </div>
          <div className="chat-messages app-scroll">
            {msgs.map((m) => (
              <div key={m.id} className={`chat-bubble-row ${m.senderType === 'contact' ? 'left' : 'right'}`}>
                <div className={`chat-bubble ${m.senderType === 'ai' ? 'ai' : m.senderType === 'contact' ? 'in' : 'out'}`}>
                  {m.senderType === 'ai' && (
                    <span className="bubble-tag">
                      <i className="ti ti-robot" /> IA
                    </span>
                  )}
                  <p>{m.content}</p>
                  <span className="bubble-time">{new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {sel.status !== 'finished' && (
            <div className="chat-input">
              <button className="icon-btn">
                <i className="ti ti-paperclip" />
              </button>
              <button className="icon-btn">
                <i className="ti ti-microphone" />
              </button>
              <input placeholder="Digite uma mensagem..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
              <button className="btn btn-primary" onClick={send}>
                <i className="ti ti-send" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="chat-main card">
          <EmptyState icon="ti ti-messages" title="Selecione uma conversa" description="Escolha uma conversa a esquerda para comecar o atendimento." />
        </div>
      )}

      {sel && showInfo && (
        <div className="chat-info card app-scroll">
          <div className="info-head"  style={{ padding: '1rem' }}>
            <div className="info-avatar">{sel.contact.name.charAt(0)}</div>
            <h3 className="info-name">{sel.contact.name}</h3>
            <p className="info-email text-muted text-sm">{sel.contact.email}</p>
          </div>
          <div className="info-sections" style={{ padding: '1rem' }}>
            <div className="info-section">
              <span className="info-label">Telefone</span>
              <span className="info-value">{sel.contact.phone || sel.contact.name}</span>
            </div>
            <div className="info-section">
              <span className="info-label">Canal</span>
              <span className="info-value">{sel.channel?.name}</span>
            </div>
            <div className="info-section">
              <span className="info-label">Origem</span>
              <span className="info-value">{sel.origin}</span>
            </div>
            <div className="info-section">
              <span className="info-label">Responsavel</span>
              <span className="info-value">{users.find((u) => u.id === sel.agentId)?.name || 'Nao atribuido'}</span>
            </div>
            <div className="info-section">
              <span className="info-label">Classificacao</span>
              {sel.classification && <span className="tag-chip" style={{ background: sel.classification.color }}>{sel.classification.name}</span>}
            </div>
            <div className="info-section col">
              <span className="info-label">Tags</span>
              <div className="flex flex-wrap gap-1">{sel.tags.map((t) => <span key={t.id} className="tag-chip" style={{ background: t.color }}>{t.name}</span>)}</div>
            </div>
            <div className="info-section col">
              <span className="info-label">Anotacoes internas</span>
              {noteList.length === 0 ? (
                <span className="text-xs text-muted">Sem anotacoes</span>
              ) : (
                <div className="flex flex-col gap-1" style={{ width: '100%' }}>
                  {visibleNotes.map((n, idx) => (
                    <div key={`${n.createdAt}-${idx}`} className="text-xs" style={{ background: '#f8fafc', borderRadius: 8, padding: '.45rem .55rem' }}>
                      <div style={{ fontWeight: 600 }}>
                        {n.author || 'Usuario'} - {new Date(n.createdAt).toLocaleString('pt-BR')}
                      </div>
                      <div>{n.text}</div>
                    </div>
                  ))}
                  {noteList.length > 2 && (
                    <button className="btn btn-light-secondary btn-sm" onClick={() => setNotesExpanded((s) => !s)}>
                      {notesExpanded ? 'Recolher' : 'Expandir'}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="info-section col">
              <span className="info-label">Resumo do atendimento</span>
              <div className="flex flex-col gap-1">
                <div className="text-xs"><strong>Status:</strong> {statusLabel[sel.status]}</div>
                <div className="text-xs"><strong>Criado em:</strong> {new Date(sel.createdAt).toLocaleString('pt-BR')}</div>
                {sel.startedAt && <div className="text-xs"><strong>Iniciado em:</strong> {new Date(sel.startedAt).toLocaleString('pt-BR')}</div>}
                {sel.finishedAt && <div className="text-xs"><strong>Finalizado em:</strong> {new Date(sel.finishedAt).toLocaleString('pt-BR')}</div>}
              </div>
            </div>
          </div>
          <div className="info-actions" style={{ padding: '1rem' }}>
            <button className="btn btn-light-primary btn-block" onClick={() => navigate('/crm', { state: { contactId: sel.contactId } })}>
              <i className="ti ti-layout-kanban" /> Vincular a oportunidade
            </button>
            <button
              className="btn btn-light-secondary btn-block"
              onClick={() => {
                setNoteText(sel.contact.notes || '');
                setNoteOpen(true);
              }}
            >
              <i className="ti ti-note" /> Anotacao interna
            </button>
            <button className="btn btn-light-secondary btn-block" onClick={() => setTagOpen(true)}>
              <i className="ti ti-tags" /> Gerenciar tags
            </button>
          </div>
        </div>
      )}

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transferir atendimento">
        <div className="flex flex-col gap-1">
          {users
            .filter((u) => u.role === 'agent' || u.role === 'supervisor')
            .map((u) => (
              <button key={u.id} className="transfer-item" onClick={() => doTransfer(u.id)}>
                <div className="avatar-sm">{u.name.charAt(0)}</div>
                <span>{u.name}</span>
                <span className="text-xs text-muted">{u.status}</span>
              </button>
            ))}
        </div>
      </Modal>

      <Modal open={finishOpen} onClose={() => setFinishOpen(false)} title="Finalizar atendimento">
        <p className="text-sm text-muted mb-2">Selecione o tipo de ocorrencia:</p>
        <div className="flex flex-col gap-1">
          {occTypes.map((o) => (
            <button key={o.id} className="transfer-item" onClick={() => doFinish(o.id)}>
              <span className="tag-chip" style={{ background: o.color }}>{o.name}</span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={quickOpen} onClose={() => setQuickOpen(false)} title="Respostas rapidas">
        <div className="flex flex-col gap-1">
          {quick.map((q) => (
            <button key={q.id} className="quick-item" onClick={() => { setText(q.message); setQuickOpen(false); }}>
              <div className="flex justify-between">
                <span className="fw-600">{q.title}</span>
                <span className="text-xs text-muted">{q.shortcut}</span>
              </div>
              <span className="text-sm text-muted">{q.message}</span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={productsOpen} onClose={() => setProductsOpen(false)} title="Enviar produto para compra">
        <div className="chat-store-modal">
          <div className="chat-store-modal-head">
            <div>
              <div className="chat-store-modal-title">Produtos ativos da Loja</div>
              <div className="chat-store-modal-subtitle">
                {sel?.contact?.name || 'Cliente'} · escolha um produto e a forma de cobrança
              </div>
            </div>
            <div className="chat-store-modal-badge">
              {products.filter((p) => p.active).length} item(ns)
            </div>
          </div>

          {products.filter((p) => p.active).length === 0 ? (
            <div className="chat-store-empty">
              <i className="ti ti-package-off" />
              <span>Nenhum produto ativo cadastrado na Loja.</span>
            </div>
          ) : (
            <div className="chat-store-grid">
              {products
                .filter((p) => p.active)
                .map((p) => (
                  <div key={p.id} className="chat-store-card">
                    <div className="chat-store-card-top">
                      <div>
                        <div className="chat-store-card-name">{p.name}</div>
                        <div className="chat-store-card-category">{p.category || 'Sem categoria'}</div>
                      </div>
                      <span className="chat-store-card-price">
                        R$ {Number(p.price || 0).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="chat-store-card-actions">
                      <button className="btn btn-sm btn-primary" onClick={() => void sendProductPayment(p, 'PIX')}>
                        <i className="ti ti-qrcode" /> PIX
                      </button>
                      <button className="btn btn-sm btn-light-secondary" onClick={() => void sendProductPayment(p, 'CARD')}>
                        <i className="ti ti-credit-card" /> Cartão
                      </button>
                      <button className="btn btn-sm btn-light-secondary" onClick={() => { setSelectedProduct(p); setSelectedCouponId(''); setProductCouponOpen(true); }}>
                        <i className="ti ti-ticket" /> Cupom
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={productCouponOpen}
        onClose={() => { setProductCouponOpen(false); setSelectedProduct(null); setSelectedCouponId(''); }}
        title={selectedProduct ? `Enviar ${selectedProduct.name} com desconto` : 'Aplicar cupom'}
        footer={
          <>
            <button className="btn btn-light-secondary" onClick={() => { setProductCouponOpen(false); setSelectedProduct(null); setSelectedCouponId(''); }}>Cancelar</button>
            <button className="btn btn-primary" disabled={!selectedProduct} onClick={() => void (selectedProduct ? sendProductPayment(selectedProduct, 'PIX', selectedCoupon) : Promise.resolve())}>
              Gerar cobrança com cupom
            </button>
          </>
        }
      >
        {!selectedProduct ? null : (
          <div className="form-group">
            <label>Cupom de desconto</label>
            <select value={selectedCouponId} onChange={(e) => setSelectedCouponId(e.target.value)}>
              <option value="">Sem cupom</option>
              {coupons.filter((item) => item.active).map((item) => (
                <option key={item.id} value={item.id}>{item.code} · {item.type === 'percent' ? `${item.value}%` : `R$ ${Number(item.value || 0).toLocaleString('pt-BR')}`}</option>
              ))}
            </select>
            <div className="text-xs text-muted mt-1">Valor original: R$ {Number(selectedProduct.price || 0).toLocaleString('pt-BR')} · Desconto: R$ {couponPreview.toLocaleString('pt-BR')} · Final: R$ {selectedProductFinalPrice.toLocaleString('pt-BR')}</div>
          </div>
        )}
      </Modal>

      <Modal open={chatFilterOpen} onClose={() => setChatFilterOpen(false)} title="Filtrar conversas">
        <div className="flex flex-col gap-1">
          {(Object.keys(filterLabel) as ChatFilter[]).map((k) => (
            <button key={k} className={`transfer-item ${filter === k ? 'active' : ''}`} onClick={() => { setFilter(k); setChatFilterOpen(false); }}>
              <span>{filterLabel[k]}</span>
              {filter === k && <i className="ti ti-check ms-auto" />}
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={tagOpen} onClose={() => setTagOpen(false)} title="Tags do atendimento">
        <div className="flex flex-col gap-1">
          {allTags.filter((t) => !(t as unknown as { isDeleted?: boolean }).isDeleted).length === 0 && (
            <p className="text-sm text-muted">Nenhuma tag cadastrada. Cadastre em Cadastros &gt; Tags.</p>
          )}
          {allTags
            .filter((t) => !(t as unknown as { isDeleted?: boolean }).isDeleted)
            .map((t) => {
              const active = sel?.tags.some((x) => x.id === t.id);
              return (
                <button key={t.id} className={`transfer-item ${active ? 'active' : ''}`} onClick={() => toggleTag(t)}>
                  <span className="tag-chip" style={{ background: t.color }}>{t.name}</span>
                  {active && <i className="ti ti-check ms-auto" />}
                </button>
              );
            })}
        </div>
      </Modal>

      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title="Anotacao interna">
        <div className="flex flex-col gap-2">
          <textarea className="form-control" rows={5} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Digite uma anotacao interna sobre o lead..." />
          <button className="btn btn-primary btn-block" onClick={saveNote}>
            Salvar anotacao
          </button>
        </div>
      </Modal>

      <Modal open={notifOpen} onClose={() => setNotifOpen(false)} title="Notificações de áudio">
        <div className="flex flex-col gap-2">
          <label className="toggle">
            <input type="checkbox" checked={notifCfg.enabled} onChange={(e) => setNotifCfg((p) => ({ ...p, enabled: e.target.checked }))} />
            <span>Ativar aviso sonoro para novos atendimentos</span>
          </label>
          <div className="form-group">
            <label>Som</label>
            <select value={notifCfg.sound} onChange={(e) => setNotifCfg((p) => ({ ...p, sound: e.target.value as 'beep' | 'chime' | 'ping' }))}>
              <option value="chime">Chime</option>
              <option value="beep">Beep</option>
              <option value="ping">Ping</option>
            </select>
          </div>
          <div className="form-group">
            <label>Volume ({Math.round(notifCfg.volume * 100)}%)</label>
            <input type="range" min={0} max={1} step={0.05} value={notifCfg.volume} onChange={(e) => setNotifCfg((p) => ({ ...p, volume: Number(e.target.value) }))} />
          </div>
          <div className="form-group">
            <label>Frequência mínima entre alertas (segundos)</label>
            <input type="number" min={1} value={notifCfg.intervalSec} onChange={(e) => setNotifCfg((p) => ({ ...p, intervalSec: Math.max(1, Number(e.target.value) || 1) }))} />
          </div>
          <div className="flex gap-1 justify-end">
            <button className="btn btn-light-secondary" onClick={() => playNotification(notifCfg.sound, notifCfg.volume)}>Testar som</button>
            <button className="btn btn-primary" onClick={() => setNotifOpen(false)}>Salvar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}