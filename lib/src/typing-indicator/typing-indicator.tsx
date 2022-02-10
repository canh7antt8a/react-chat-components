import React, { FC, useState, useEffect, useCallback, useRef } from "react";
import { usePubNub } from "pubnub-react";
import { useAtom } from "jotai";
import {
  CurrentChannelTypingIndicatorAtom,
  ThemeAtom,
  TypingIndicatorTimeoutAtom,
  UsersMetaAtom,
} from "../state-atoms";
import isEqual from "lodash.isequal";
import "./typing-indicator.scss";

export interface TypingIndicatorProps {
  /** Option to put a typing indicator inside the MessageList component to render indicators as messages. */
  showAsMessage?: boolean;
}

/** Subscribes to events generated by MessageInput to display information about users that are
 * currently typing messages.
 *
 * It can be displayed as a text denoting the user's name, or in a form similar to
 * a message that can be renderer inside MessageList.
 */
export const TypingIndicator: FC<TypingIndicatorProps> = (props: TypingIndicatorProps) => {
  const pubnub = usePubNub();

  const [theme] = useAtom(ThemeAtom);
  const [users] = useAtom(UsersMetaAtom);
  const [typingIndicators] = useAtom(CurrentChannelTypingIndicatorAtom);
  const [typingIndicatorTimeout] = useAtom(TypingIndicatorTimeoutAtom);
  const [activeUUIDs, setActiveUUIDs] = useState([]);
  const typingIndicatorsRef = useRef(typingIndicators);

  if (!isEqual(typingIndicatorsRef.current, typingIndicators)) {
    typingIndicatorsRef.current = typingIndicators;
  }

  const calculateActiveUUIDs = useCallback(() => {
    const currentActiveUUIDs = Object.keys(typingIndicators).filter(
      (id) => Date.now() - parseInt(typingIndicators[id]) / 10000 < typingIndicatorTimeout * 1000
    );
    const currentActiveUUIDsWoCurrent = currentActiveUUIDs.filter((id) => id !== pubnub.getUUID());
    setActiveUUIDs(currentActiveUUIDsWoCurrent);
  }, [typingIndicatorsRef.current]);

  const getIndicationString = () => {
    let indicateStr = "";
    if (activeUUIDs.length > 1) indicateStr = "Multiple users are typing...";
    if (activeUUIDs.length == 1) {
      const user = users.find((u) => u.id === activeUUIDs[0]);
      indicateStr = `${user?.name || "Unknown User"} is typing...`;
    }
    return indicateStr;
  };

  useEffect(() => {
    calculateActiveUUIDs();
    const interval = setInterval(calculateActiveUUIDs, 1000);
    return () => clearInterval(interval);
  }, [calculateActiveUUIDs]);

  const renderUserBubble = (uuid) => {
    const user = users.find((u) => u.id === uuid);

    return (
      <div className="pn-msg" key={uuid}>
        <div className="pn-msg__avatar">
          {user?.profileUrl && <img src={user.profileUrl} alt="User avatar" />}
          {!user?.profileUrl && <div className="pn-msg__avatar-placeholder" />}
        </div>

        <div className="pn-msg__main">
          <div className="pn-msg__title">
            <span className="pn-msg__author">{user?.name || "Unknown User"}</span>
          </div>
          <div className="pn-msg__bubble">
            <span className="pn-typing-indicator-dot">●</span>
            <span className="pn-typing-indicator-dot">●</span>
            <span className="pn-typing-indicator-dot">●</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {!props.showAsMessage && !!activeUUIDs.length && (
        <div className={`pn-typing-indicator pn-typing-indicator--${theme}`}>
          {getIndicationString()}&nbsp;
        </div>
      )}
      {props.showAsMessage && activeUUIDs.map((uuid) => renderUserBubble(uuid))}
    </>
  );
};

TypingIndicator.defaultProps = {
  showAsMessage: false,
};
