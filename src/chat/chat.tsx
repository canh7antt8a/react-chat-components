import React, { FC, useEffect, ReactNode } from "react";
import { RecoilRoot, useRecoilState, useSetRecoilState } from "recoil";
import {
  BaseObjectsEvent,
  MessageActionEvent,
  PresenceEvent,
  SignalEvent,
  UserData,
  FileEvent,
  StatusEvent,
} from "pubnub";
import { usePubNub } from "pubnub-react";
import { PickerProps } from "emoji-mart";
import { Themes, Message } from "../types";
import cloneDeep from "lodash.clonedeep";
import setDeep from "lodash.set";
import {
  CurrentChannelAtom,
  EmojiMartOptionsAtom,
  MessagesAtom,
  SubscribeChannelsAtom,
  SubscribeChannelGroupsAtom,
  ThemeAtom,
  TypingIndicatorAtom,
  TypingIndicatorTimeoutAtom,
  UsersMetaAtom,
} from "../state-atoms";

/**
 * Chat wrapper is used to configure various common options and feed the components with data.
 * It expects at least a configured PubNub object and a "current" channel to display within components.
 */
export interface ChatProps {
  children?: ReactNode;
  /** A general theme to be used by the components.
   * Exact looks can be tweaked later on with the use of CSS variables. */
  theme?: Themes;
  /** A "current" channel to display the messages and members from. */
  channel: string;
  /** Array of channels to subscribe to get events. Allows up to 50 channels. */
  subscribeChannels?: string[];
  /** Array of channels to subscribe to get events. Allows up to 50 channels. */
  subscribeChannelGroups?: string[];
  /** Set to false to disable presence events. OccupancyIndicator and MemberList component will only work with memberships in that case. */
  presence?: boolean;
  /** Provide external list of user metadata. */
  userList?: UserData[];
  /** Define a timeout in seconds for typing indicators to hide after last types character */
  typingIndicatorTimeout?: number;
  /** Pass options to emoji-mart picker. */
  emojiMartOptions?: PickerProps;
  /** A callback run on new messages. */
  onMessage?: (message: Message) => unknown;
  /** A callback run on signals. */
  onSignal?: (message: SignalEvent) => unknown;
  /** A callback run on message actions. */
  onAction?: (event: MessageActionEvent) => unknown;
  /** A callback run on presence events. */
  onPresence?: (event: PresenceEvent) => unknown;
  /** A callback run on object events. */
  onObject?: (event: BaseObjectsEvent) => unknown;
  /** A callback run on file events. */
  onFile?: (event: FileEvent) => unknown;
  /** A callback run on status events. */
  onStatus?: (event: StatusEvent) => unknown;
}

export const Chat: FC<ChatProps> = (props: ChatProps) => {
  return (
    <RecoilRoot>
      <ChatInternal {...props}></ChatInternal>
    </RecoilRoot>
  );
};

Chat.defaultProps = {
  emojiMartOptions: { emoji: "", title: "", native: true },
  subscribeChannels: [],
  subscribeChannelGroups: [],
  theme: "light" as const,
  presence: true,
  typingIndicatorTimeout: 10,
  userList: [],
};

/**
 *
 *  Internal Chat wrapper with all business logic
 *
 */
export const ChatInternal: FC<ChatProps> = (props: ChatProps) => {
  const pubnub = usePubNub();
  const setEmojiMartOptions = useSetRecoilState(EmojiMartOptionsAtom);
  const setMessages = useSetRecoilState(MessagesAtom);
  const setTheme = useSetRecoilState(ThemeAtom);
  const setTypingIndicator = useSetRecoilState(TypingIndicatorAtom);
  const setUsersMeta = useSetRecoilState(UsersMetaAtom);
  const [currentChannel, setCurrentChannel] = useRecoilState(CurrentChannelAtom);
  const [subscribeChannels, setSubscribeChannels] = useRecoilState(SubscribeChannelsAtom);
  const [subscribeChannelGroups, setSubscribeChannelGroups] = useRecoilState(
    SubscribeChannelGroupsAtom
  );
  const [typingIndicatorTimeout, setTypingIndicatorTimeout] = useRecoilState(
    TypingIndicatorTimeoutAtom
  );

  /**
   * Lifecycle: load one-off props
   */
  useEffect(() => {
    setTheme(props.theme);
    setEmojiMartOptions(props.emojiMartOptions);
    setTypingIndicatorTimeout(props.typingIndicatorTimeout);
  }, []);

  useEffect(() => {
    setUsersMeta(props.userList);
  }, [props.userList]);

  /**
   * Lifecycle: load updateable props
   */
  useEffect(() => {
    setCurrentChannel(props.channel);
  }, [props.channel]);

  useEffect(() => {
    setSubscribeChannels(props.subscribeChannels);
  }, [props.subscribeChannels]);

  useEffect(() => {
    setSubscribeChannelGroups(props.subscribeChannelGroups);
  }, [props.subscribeChannelGroups]);

  /**
   * Lifecycle: react to state changes
   */
  useEffect(() => {
    if (!pubnub) return;
    setupListeners();

    // Try to unsubscribe beofore window is unloaded
    window.addEventListener("beforeunload", () => {
      pubnub.stop();
    });

    return () => {
      pubnub.stop();
    };
  }, [pubnub]);

  useEffect(() => {
    if (!currentChannel) return;
    if (!subscribeChannels.includes(currentChannel)) {
      setSubscribeChannels([...subscribeChannels, currentChannel]);
    }
  }, [currentChannel]);

  useEffect(() => {
    if (!subscribeChannels.length && !subscribeChannelGroups.length) return;
    setupSubscriptions();
  }, [subscribeChannels, subscribeChannelGroups]);

  /**
   * Commands
   */
  const setupListeners = () => {
    pubnub.addListener({
      message: (m) => handleMessage(m),
      messageAction: (m) => handleAction(m),
      presence: (e) => handlePresenceEvent(e),
      objects: (e) => handleObjectsEvent(e),
      signal: (e) => handleSignalEvent(e),
      file: (e) => handleFileEvent(e),
      status: (e) => handleStatusEvent(e),
    });
  };

  const setupSubscriptions = () => {
    const userChannel = pubnub.getUUID();

    const currentSubscriptions = pubnub.getSubscribedChannels();
    const newChannels = subscribeChannels.filter((c) => !currentSubscriptions.includes(c));

    const currentGroups = pubnub.getSubscribedChannelGroups();
    const newGroups = subscribeChannelGroups.filter((c) => !currentGroups.includes(c));

    if (!currentSubscriptions.includes(userChannel)) {
      pubnub.subscribe({ channels: [userChannel] });
    }

    if (newChannels.length || newGroups.length) {
      pubnub.subscribe({
        channels: newChannels,
        channelGroups: newGroups,
        withPresence: props.presence,
      });
    }
  };

  /**
   * Event handlers
   */
  const handleMessage = (message: Message) => {
    if (props.onMessage) props.onMessage(message);

    setMessages((messages) => {
      const messagesClone = cloneDeep(messages) || {};
      messagesClone[message.channel] = messagesClone[message.channel] || [];
      messagesClone[message.channel].push(message);
      return messagesClone;
    });
  };

  const handleSignalEvent = (signal: SignalEvent) => {
    if (props.onSignal) props.onSignal(signal);

    if (["typing_on", "typing_off"].includes(signal.message.type)) {
      setTypingIndicator((indicators) => {
        const indicatorsClone = cloneDeep(indicators);
        const value = signal.message.type === "typing_on" ? signal.timetoken : null;
        setDeep(indicatorsClone, [signal.channel, signal.publisher], value);
        return indicatorsClone;
      });

      setTimeout(() => {
        setTypingIndicator((indicators) => {
          const indicatorsClone = cloneDeep(indicators);
          setDeep(indicatorsClone, [signal.channel, signal.publisher], null);
          return indicatorsClone;
        });
      }, typingIndicatorTimeout * 1000);
    }
  };

  const handlePresenceEvent = (event: PresenceEvent) => {
    if (props.onPresence) props.onPresence(event);
  };

  const handleObjectsEvent = (event: BaseObjectsEvent) => {
    if (props.onObject) props.onObject(event);
  };

  const handleAction = (action: MessageActionEvent) => {
    if (props.onAction) props.onAction(action);

    setMessages((messages) => {
      if (!messages || !messages[action.channel]) return;

      const { channel, event } = action;
      const { type, value, actionTimetoken, messageTimetoken, uuid } = action.data;
      const messagesClone = cloneDeep(messages);
      const message = messagesClone[channel].find((m) => m.timetoken === messageTimetoken);
      const actions = message?.actions?.[type]?.[value] || [];

      if (message && event === "added") {
        const newActions = [...actions, { uuid, actionTimetoken }];
        setDeep(message, ["actions", type, value], newActions);
      }

      if (message && event === "removed") {
        const newActions = actions.filter((a) => a.actionTimetoken !== actionTimetoken);
        newActions.length
          ? setDeep(message, ["actions", type, value], newActions)
          : delete message.actions[type][value];
      }

      return messagesClone;
    });
  };

  const handleFileEvent = (event: FileEvent) => {
    if (props.onFile) props.onFile(event);
  };

  const handleStatusEvent = (event: StatusEvent) => {
    if (props.onStatus) props.onStatus(event);
  };

  return <>{props.children}</>;
};