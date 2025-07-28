/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";

import OBSWebSocket, { OBSWebSocketError } from "./obs-websocket-js/json";

const logger = new Logger("OBS Remote Control");

interface VOICE_CHANNEL_SELECT_DATA {
    guildId?: string;
    channelId?: string;
    currentVoiceChannelId?: string;
}

const settings = definePluginSettings({
    origin: {
        description: "The origin of the OBS websocket.",
        type: OptionType.STRING,
        default: "ws://127.0.0.1:4455"
    },
    password: {
        description: "The password of the OBS websocket, leave this empty if your websocket doesn't have a password.",
        type: OptionType.STRING,
        default: ""
    },

    separator: {
        type: OptionType.COMPONENT,
        component: () => (
            <div className="vc-obsremotecontrol-separator" />
        )
    },
    toggleReplayBuffer: {
        description: "Toggle the replay buffer when joining/leaving a voice channel.",
        type: OptionType.BOOLEAN,
        default: true
    },
    guildWhitelist: {
        description: "A comma-separated list of guild IDs to whitelist, leave this empty to disable the whitelist.",
        type: OptionType.STRING,
        default: ""
    }
});

export default definePlugin({
    name: "OBS Remote Control",
    description: "Control OBS from Discord using websockets.",
    authors: [{
        name: "FawazT",
        id: 228825096360296448n
    }],
    settings,
    flux: {
        VOICE_CHANNEL_SELECT: onVoiceChannelSelect
    },
    start() {
        window.addEventListener("beforeunload", cleanUp);
    },
    async stop() {
        window.removeEventListener("beforeunload", cleanUp);
        await cleanUp();
    }
});

async function onVoiceChannelSelect({ guildId, channelId, currentVoiceChannelId }: VOICE_CHANNEL_SELECT_DATA) {
    if (!settings.store.toggleReplayBuffer) {
        return;
    }

    if (isJoining(channelId, currentVoiceChannelId)) {
        const whitelist = settings.store.guildWhitelist.split(",").map(e => e.trim()).filter(e => e);

        if (!guildId || !whitelist.length || whitelist.includes(guildId)) {
            await startReplayBuffer();
        }
    } else if (isLeaving(channelId, currentVoiceChannelId)) {
        await stopReplayBuffer();
    } else if (isSwitching(channelId, currentVoiceChannelId)) {
        const whitelist = settings.store.guildWhitelist.split(",").map(e => e.trim()).filter(e => e);

        if (!guildId || !whitelist.length || whitelist.includes(guildId)) {
            await startReplayBuffer();
        } else if (guildId && whitelist.length && !whitelist.includes(guildId)) {
            await stopReplayBuffer();
        }
    }
}

async function cleanUp() {
    if (!settings.store.origin) {
        return;
    }
    const obs = new OBSWebSocket();

    try {
        if (settings.store.toggleReplayBuffer) {
            await obs.connect(settings.store.origin, settings.store.password);
            await obs.call("StopReplayBuffer");
        }
    } catch (e) {
        if (!(e instanceof OBSWebSocketError) || e.code !== 501) {
            logger.error("An error occurred while stopping the replay buffer:", e, JSON.stringify(e));
        }
    }
    try {
        if (obs.identified) {
            await obs.disconnect();
        }
    } catch (e) {
        logger.error("An error occurred while disconnecting from the websocket:", e, JSON.stringify(e));
    }
}

async function startReplayBuffer() {
    if (!settings.store.origin) {
        showNotification({
            title: "OBS Remote Control",
            body: "The origin of the OBS websocket is missing. Please check your settings."
        });
        return;
    }
    const obs = new OBSWebSocket();

    try {
        await obs.connect(settings.store.origin, settings.store.password);
        await obs.call("StartReplayBuffer");
    } catch (e) {
        if (!(e instanceof OBSWebSocketError) || e.code !== 500) {
            logger.error("An error occurred while starting the replay buffer:", e, JSON.stringify(e));
            showNotification({
                title: "OBS Remote Control",
                body: "An error occurred while starting the replay buffer. Check the console for more information."
            });
        }
    }
    try {
        if (obs.identified) {
            await obs.disconnect();
        }
    } catch (e) {
        logger.error("An error occurred while disconnecting from the websocket:", e, JSON.stringify(e));
    }
}

async function stopReplayBuffer() {
    if (!settings.store.origin) {
        showNotification({
            title: "OBS Remote Control",
            body: "The origin of the OBS websocket is missing. Please check your settings."
        });
        return;
    }
    const obs = new OBSWebSocket();

    try {
        await obs.connect(settings.store.origin, settings.store.password);
        await obs.call("StopReplayBuffer");
    } catch (e) {
        if (!(e instanceof OBSWebSocketError) || e.code !== 501) {
            logger.error("An error occurred while stopping the replay buffer:", e, JSON.stringify(e));
            showNotification({
                title: "OBS Remote Control",
                body: "An error occurred while stopping the replay buffer. Check the console for more information."
            });
        }
    }

    try {
        if (obs.identified) {
            await obs.disconnect();
        }
    } catch (e) {
        logger.error("An error occurred while disconnecting from the websocket:", e, JSON.stringify(e));
    }
}

function isJoining(channelId, currentVoiceChannelId): boolean {
    return channelId && !currentVoiceChannelId;
}

function isLeaving(channelId, currentVoiceChannelId): boolean {
    return !channelId && currentVoiceChannelId;
}

function isSwitching(channelId, currentVoiceChannelId): boolean {
    return channelId && currentVoiceChannelId;
}
