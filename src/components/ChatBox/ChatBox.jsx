import React, { useContext, useEffect, useState, useRef, useMemo } from "react";
import "./Chatbox.css";
import assets from "../../assets/assets";
import { AppContext } from "../../context/AppContext";
import { arrayUnion, doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import uploadToCloudinary from "../../lib/Upload";

const Chatbox = () => {
  const { userData, messagesId, chatUser, messages, setMessages, chatVisible, setChatVisible } = useContext(AppContext);
  const [input, setInput] = useState("");
  const [showWelcome, setShowWelcome] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [avatar, setAvatar] = useState(chatUser?.userData?.avatar || assets.defaultAvatar);
  const previousAvatar = useRef(chatUser?.userData?.avatar || assets.defaultAvatar);

  // Update avatar only if it actually changes
  useEffect(() => {
    if (chatUser?.userData?.avatar && chatUser.userData.avatar !== previousAvatar.current) {
      setTimeout(() => {
        setAvatar(chatUser.userData.avatar);
        previousAvatar.current = chatUser.userData.avatar;
      }); // 200ms debounce to prevent flickering
    }
  }, [chatUser?.userData?.avatar]);

  // Memoized avatar to avoid unnecessary re-renders
  const memoizedAvatar = useMemo(() => avatar, [avatar]);

  useEffect(() => {
    if (messagesId) {
      setShowWelcome(false);
    }
  }, [messagesId]);

  useEffect(() => {
    if (!messagesId) {
      setLoadingMessages(true);
    }
  }, [messagesId]);

  const sendMessage = async () => {
    if (!input.trim() || !messagesId) return;

    try {
      await updateDoc(doc(db, "messages", messagesId), {
        messages: arrayUnion({
          sId: userData.id,
          text: input,
          createdAt: new Date(),
        }),
      });

      const userChatsRef = [doc(db, "chats", userData.id), doc(db, "chats", chatUser.rId)];

      await Promise.all(
        userChatsRef.map(async (chatRef) => {
          const chatSnap = await getDoc(chatRef);
          if (chatSnap.exists()) {
            const chatData = chatSnap.data();
            const chatIndex = chatData.chatData.findIndex((c) => c.messageId === messagesId);

            if (chatIndex > -1) {
              chatData.chatData[chatIndex].lastMessage = input.slice(0, 30);
              chatData.chatData[chatIndex].updatedAt = Date.now();
              if (chatRef.id === chatUser.rId) {
                chatData.chatData[chatIndex].messageSeen = false;
              }

              await updateDoc(chatRef, { chatData: chatData.chatData });
            }
          }
        })
      );

      setInput("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const sendImage = async (e) => {
    try {
      const fileUrl = await uploadToCloudinary(e.target.files[0]);
      if (fileUrl && messagesId) {
        await updateDoc(doc(db, "messages", messagesId), {
          messages: arrayUnion({
            sId: userData.id,
            image: fileUrl,
            createdAt: new Date(),
          }),
        });

        const userChatsRef = [doc(db, "chats", userData.id), doc(db, "chats", chatUser.rId)];

        await Promise.all(
          userChatsRef.map(async (chatRef) => {
            const chatSnap = await getDoc(chatRef);
            if (chatSnap.exists()) {
              const chatData = chatSnap.data();
              const chatIndex = chatData.chatData.findIndex((c) => c.messageId === messagesId);

              if (chatIndex > -1) {
                chatData.chatData[chatIndex].lastMessage = "Image";
                chatData.chatData[chatIndex].updatedAt = Date.now();
                if (chatRef.id === chatUser.rId) {
                  chatData.chatData[chatIndex].messageSeen = false;
                }

                await updateDoc(chatRef, { chatData: chatData.chatData });
              }
            }
          })
        );
      }
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  const convertTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    return hour > 12 ? `${hour - 12}:${minute} PM` : `${hour}:${minute} AM`;
  };

  useEffect(() => {
    if (messagesId) {
      const unSub = onSnapshot(doc(db, "messages", messagesId), (res) => {
        setMessages(res.data().messages.reverse());
        setLoadingMessages(false);
      });
      return () => {
        unSub();
      };
    }
  }, [messagesId]);

  return (
    <>
      {showWelcome && (
        <div className={`chat-welcome ${chatVisible ? "" : "hidden"}`}>
          <img src={assets.logoIcon} alt="Logo" />
          <p>Welcome back! Start a new conversation or select a chat.</p>
        </div>
      )}

      {chatUser && !showWelcome && (
        <div className={`chat-box ${chatVisible ? "" : "hidden"}`}>
          <div className="chat-user">
            <img src={memoizedAvatar} alt="User Avatar" />
            <p>
              {chatUser.userData.name}
              {Date.now() - chatUser.userData.lastSeen <= 70000 && (
                <img className="dot" src={assets.greenDot} alt="Online" />
              )}
            </p>
            <img src={assets.helpIcon} className="help" alt="Help" />
            <img onClick={() => setChatVisible(false)} src={assets.arrowIcon} className="arrow" alt="Close" />
          </div>

          <div className="chat-msg">
            {loadingMessages ? (
              <div className="loading">Loading messages...</div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className={msg.sId === userData.id ? "s-msg" : "r-msg"}>
                  {msg.image ? (
                    <img className="msg-img" src={msg.image} alt="Sent Image" />
                  ) : (
                    <p className="msg">{msg.text}</p>
                  )}

                  <div>
                    <img
                      src={msg.sId === userData.id ? userData.avatar : memoizedAvatar}
                      alt="Avatar"
                    />
                    <p>{convertTimestamp(msg.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="chat-input">
            <input
              onChange={(e) => setInput(e.target.value)}
              value={input}
              type="text"
              placeholder="Send a message"
            />
            <input
              onChange={sendImage}
              type="file"
              id="image"
              accept="image/png, image/jpeg"
              hidden
            />
            <label htmlFor="image">
              <img src={assets.galleryIcon} alt="Gallery" />
            </label>
            <img onClick={sendMessage} src={assets.sendButton} alt="Send" />
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbox;