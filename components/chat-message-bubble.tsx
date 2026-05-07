import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import {
    Image,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import {
    fileNameFromUrl,
    getChatAttachmentDisplayName,
    getUserDisplayFromName,
    getUserInitialsFromName,
    isChatPlaceholderText,
    isLikelyImageUrl,
    isLikelyPdfUrl,
    openAttachmentUrl,
    type ChatMessage,
} from '@/lib/requests-api';

const isWeb = Platform.OS === 'web';

function UserAvatar({ initials, size = 40 }: { initials: string; size?: number }) {
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.avatarText, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
}

type ChatMessageBubbleProps = {
  message: ChatMessage;
  isOwn: boolean;
  onLongPress?: (x: number, y: number) => void;
  /** Компактный вид для узких экранов (мобильный чат заявки) */
  compact?: boolean;
};

export function ChatMessageBubble({ message, isOwn, onLongPress, compact }: ChatMessageBubbleProps) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const peerColMax = compact
    ? Math.min(248, winWidth * 0.66)
    : Math.min(300, winWidth * 0.72);
  const ownColMax = compact
    ? Math.min(320, winWidth * 0.74)
    : Math.min(400, winWidth * 0.8);
  const mediaW = compact
    ? Math.min(228, winWidth * 0.63)
    : Math.min(280, winWidth * 0.7);
  const chatImgH = compact ? Math.min(300, winHeight * 0.36) : Math.min(400, winHeight * 0.4);
  const avatarSize = compact ? 28 : 36;

  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const initials = getUserInitialsFromName(message.firstName, message.lastName);
  const displayName = getUserDisplayFromName(message.firstName, message.lastName);
  const time = new Date(message.createdAt).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const attachmentItems = message.attachments ?? [];
  const hasAttachments = attachmentItems.length > 0;
  const hidePlaceholderText = hasAttachments && isChatPlaceholderText(message.text);
  const showText = !hidePlaceholderText && (message.text?.trim() ?? '').length > 0;
  // Только файл/картинка без подписи: не рисуем пустой пузырь — время под вложением
  const onlyMediaNoText = hasAttachments && !showText && !message.isEdited;

  const attachmentsInner = hasAttachments && (
    <View style={[s.attachmentsBlock, compact && s.attachmentsBlockCompact]}>
      {attachmentItems.map((item, idx) => {
        const url = item.url;
        const displayName = getChatAttachmentDisplayName(item);
        const isImg = isLikelyImageUrl(url) || item.fileType?.startsWith('image/');
        if (isImg) {
          return (
            <View
              key={`${url}-${idx}`}
              style={[s.attachmentItem, { width: mediaW, alignSelf: isOwn ? 'flex-end' : 'flex-start' }]}
            >
              <Pressable
                onPress={() => setLightboxUri(url)}
                onLongPress={(e) => onLongPress?.(e.nativeEvent.pageX, e.nativeEvent.pageY)}
                style={[s.imagePressable, compact && s.imagePressableCompact]}
              >
                <Image source={{ uri: url }} style={[s.chatImage, { height: chatImgH }]} resizeMode="contain" />
              </Pressable>
              <Text style={[s.imageFileName, compact && s.imageFileNameCompact]} numberOfLines={2}>
                {displayName}
              </Text>
              <TouchableOpacity
                style={s.downloadRow}
                onPress={() => void openAttachmentUrl(url, displayName || 'image.jpg')}
                activeOpacity={0.7}
              >
                <MaterialIcons name="file-download" size={compact ? 14 : 16} color={Colors.light.button} />
                <Text style={[s.downloadText, compact && s.downloadTextCompact]}>Скачать</Text>
              </TouchableOpacity>
            </View>
          );
        }
        const isPdf = isLikelyPdfUrl(url) || item.fileType === 'application/pdf';
        return (
          <View
            key={`${url}-${idx}`}
            style={[
              s.docCard,
              compact && s.docCardCompact,
              { width: mediaW, alignSelf: isOwn ? 'flex-end' : 'flex-start' },
            ]}
          >
            <Pressable
              onLongPress={(e) => onLongPress?.(e.nativeEvent.pageX, e.nativeEvent.pageY)}
              style={s.docRow}
            >
              <MaterialIcons name="picture-as-pdf" size={compact ? 28 : 32} color="#B91C1C" />
              <View style={s.docInfo}>
                <Text style={[s.docLabel, compact && s.docLabelCompact]} numberOfLines={2}>
                  {displayName}
                </Text>
                {isPdf && (
                  <Text style={s.docSub} numberOfLines={1}>
                    PDF
                  </Text>
                )}
              </View>
            </Pressable>
            <TouchableOpacity
              style={s.docDownload}
              onPress={() => void openAttachmentUrl(url, displayName)}
            >
              <MaterialIcons name="file-download" size={compact ? 16 : 18} color={Colors.light.button} />
              <Text style={[s.docDownloadText, compact && s.docDownloadTextCompact]}>Скачать</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );

  return (
    <>
      <View style={[s.messageRow, compact && s.messageRowCompact, isOwn ? s.messageRowOwn : s.messageRowPeer]}>
        {!isOwn && <UserAvatar initials={initials} size={avatarSize} />}
        <View
          style={[
            s.messageColumn,
            isOwn ? s.messageColumnOwn : s.messageColumnPeer,
            isOwn ? { maxWidth: ownColMax } : { maxWidth: peerColMax },
          ]}
        >
          {onlyMediaNoText ? (
            <Pressable
              onLongPress={(e) => onLongPress?.(e.nativeEvent.pageX, e.nativeEvent.pageY)}
              style={[s.mediaOnlyWrap, isOwn && s.mediaOnlyWrapOwn]}
            >
              {attachmentsInner}
              <View style={[s.timeRowMediaOnly, isOwn && s.timeRowMediaOnlyOwn]}>
                {!isOwn && (
                  <Text style={[s.senderInTimeRow, compact && s.senderInTimeRowCompact]}>{displayName}</Text>
                )}
                <Text style={[s.messageTime, compact && s.messageTimeCompact, isOwn && s.messageTimeOwn]}>
                  {time}
                </Text>
              </View>
            </Pressable>
          ) : (
            <>
              {attachmentsInner}
              <Pressable
                onLongPress={(event) => onLongPress?.(event.nativeEvent.pageX, event.nativeEvent.pageY)}
                style={[
                  s.messageBubble,
                  compact && s.messageBubbleCompact,
                  isOwn ? s.messageBubbleOwn : s.messageBubbleOther,
                  isOwn
                    ? { maxWidth: ownColMax, alignSelf: 'flex-end' }
                    : { maxWidth: peerColMax, alignSelf: 'flex-start' },
                  hasAttachments && s.messageBubbleTightTop,
                ]}
              >
                {!isOwn && <Text style={[s.messageSender, compact && s.messageSenderCompact]}>{displayName}</Text>}
                <View style={[s.messageContent, compact && s.messageContentCompact]}>
                  {showText && (
                    <Text style={[s.messageText, compact && s.messageTextCompact, isOwn && s.messageTextOwn]}>
                      {message.text}
                    </Text>
                  )}
                  {message.isEdited && (
                    <Text style={[s.messageEdited, compact && s.messageEditedCompact]}>изменено</Text>
                  )}
                  <Text style={[s.messageTime, compact && s.messageTimeCompact, isOwn && s.messageTimeOwn]}>
                    {time}
                  </Text>
                </View>
              </Pressable>
            </>
          )}
        </View>
        {isOwn && <UserAvatar initials={initials} size={avatarSize} />}
      </View>

      <Modal visible={!!lightboxUri} transparent animationType="fade" onRequestClose={() => setLightboxUri(null)}>
        <View style={s.lightboxRoot}>
          <Pressable style={s.lightboxBackdrop} onPress={() => setLightboxUri(null)} />
          {lightboxUri && (
            <View style={s.lightboxContent} pointerEvents="box-none">
              <View style={s.lightboxHeader}>
                <TouchableOpacity
                  onPress={() => {
                    void openAttachmentUrl(lightboxUri, fileNameFromUrl(lightboxUri, 'image.jpg'));
                  }}
                  style={s.lightboxIconBtn}
                >
                  <MaterialIcons name="file-download" size={26} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setLightboxUri(null)} style={s.lightboxIconBtn}>
                  <MaterialIcons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
              <Image
                source={{ uri: lightboxUri }}
                style={[s.lightboxImage, { width: winWidth, height: winHeight * 0.88 }]}
                resizeMode="contain"
              />
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  avatar: {
    backgroundColor: 'rgb(5, 148, 103)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '600' },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowPeer: {
    alignSelf: 'flex-start',
    maxWidth: '76%',
  },
  messageRowOwn: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    flexDirection: 'row',
  },
  messageColumn: {
    minWidth: 0,
    gap: 6,
  },
  messageColumnPeer: {
    alignItems: 'flex-start',
  },
  messageColumnOwn: {
    alignItems: 'flex-end',
  },
  mediaOnlyWrap: {
    alignItems: 'flex-start',
  },
  mediaOnlyWrapOwn: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
  },
  timeRowMediaOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  timeRowMediaOnlyOwn: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  senderInTimeRow: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  attachmentsBlock: {
    gap: 8,
  },
  attachmentItem: {
    alignSelf: 'flex-start',
  },
  imagePressable: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  chatImage: {
    width: '100%' as const,
  },
  imageFileName: {
    fontSize: 12,
    color: Colors.light.link,
    marginTop: 6,
    width: '100%' as const,
  },
  downloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 4,
    paddingVertical: 4,
  },
  downloadText: {
    fontSize: 13,
    color: Colors.light.button,
    fontWeight: '500',
  },
  docCard: {
    borderWidth: 2,
    borderColor: 'rgb(5, 148, 103)',
    borderRadius: 14,
    backgroundColor: '#FFF',
    padding: 10,
    gap: 8,
    alignSelf: 'flex-start',
  },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  docInfo: { flex: 1, minWidth: 0 },
  docLabel: { fontSize: 15, fontWeight: '600', color: Colors.light.text },
  docSub: { fontSize: 12, color: Colors.light.link, marginTop: 2 },
  docDownload: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  docDownloadText: { fontSize: 14, color: Colors.light.button, fontWeight: '500' },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    minWidth: 0,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: 'rgb(5, 148, 103)',
  },
  messageBubbleTightTop: { marginTop: 0 },
  messageBubbleOther: { borderBottomLeftRadius: 4 },
  messageBubbleOwn: { borderBottomRightRadius: 4 },
  messageSender: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  messageContent: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' },
  messageContentCompact: { gap: 6 },
  messageText: { fontSize: 15, color: Colors.light.text, lineHeight: 20, flexShrink: 1, minWidth: 0 },
  messageTextOwn: { color: Colors.light.text },
  messageTime: { fontSize: 11, color: Colors.light.link },
  messageTimeOwn: { color: Colors.light.link },
  messageEdited: { fontSize: 11, color: Colors.light.link },
  messageRowCompact: {
    gap: 6,
  },
  messageBubbleCompact: {
    padding: 9,
    borderRadius: 13,
    borderWidth: 1.5,
  },
  messageSenderCompact: {
    fontSize: 11,
    marginBottom: 2,
  },
  messageTextCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  messageTimeCompact: {
    fontSize: 10,
  },
  messageEditedCompact: {
    fontSize: 10,
  },
  senderInTimeRowCompact: {
    fontSize: 11,
  },
  imageFileNameCompact: {
    fontSize: 11,
    marginTop: 4,
  },
  downloadTextCompact: {
    fontSize: 12,
  },
  docLabelCompact: {
    fontSize: 13,
  },
  docDownloadTextCompact: {
    fontSize: 13,
  },
  docCardCompact: {
    padding: 8,
    gap: 6,
    borderRadius: 12,
  },
  imagePressableCompact: {
    borderRadius: 12,
  },
  attachmentsBlockCompact: {
    gap: 6,
  },
  lightboxRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
  },
  lightboxBackdrop: { ...StyleSheet.absoluteFill },
  lightboxContent: { flex: 1, justifyContent: 'center' },
  lightboxHeader: {
    position: 'absolute',
    top: isWeb ? 12 : 48,
    right: 12,
    zIndex: 2,
    flexDirection: 'row',
    gap: 12,
  },
  lightboxIconBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 22 },
  lightboxImage: {
    alignSelf: 'center',
  },
});
