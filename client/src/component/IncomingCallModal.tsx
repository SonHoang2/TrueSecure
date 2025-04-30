import React from "react";
import { IMAGES_URL } from "../config/config";
import { MdClose, MdCall } from "react-icons/md";

export const IncomingCallModal = ({ onReject, onAccept, sender }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-md">
      <div className="relative bg-white p-6 rounded-2xl shadow-xl w-80 text-center animate-fade-in">
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 transition"
          onClick={onReject}
        >
          <MdClose size={20} className="text-white" />
        </button>

        <h2 className="text-gray-800 text-xl font-semibold">Incoming Call</h2>

        <div className="mt-4 flex justify-center">
          <img
            className="size-16 rounded-full shadow-md border-2 border-gray-300"
            src={`${IMAGES_URL}/${sender.avatar}`}
            alt="Caller Avatar"
          />
        </div>

        <h1 className="text-gray-700 text-lg font-medium mt-2">
          {sender.firstName} {sender.lastName} is calling you
        </h1>

        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={onReject}
            className="flex items-center gap-2 bg-red-500 px-5 py-2 rounded-full text-white font-medium shadow-md hover:bg-red-600 transition-transform transform hover:scale-110 active:scale-95"
          >
            <MdClose size={20} className="text-white" />
            Reject
          </button>

          <button
            onClick={onAccept}
            className="flex items-center gap-2 bg-green-500 px-5 py-2 rounded-full text-white font-medium shadow-md hover:bg-green-600 transition-transform transform hover:scale-110 active:scale-95"
          >
            <MdCall size={20} className="text-white" />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};
