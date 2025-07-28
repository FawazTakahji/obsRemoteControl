/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Base64 from "../../crypto-js/enc-base64";
import sha256 from "../../crypto-js/sha256";

/**
 * SHA256 Hashing.
 * @param  {string} [salt=''] salt.
 * @param  {string} [challenge=''] challenge.
 * @param  {string} msg Message to encode.
 * @returns {string} sha256 encoded string.
 */
export default function (salt: string, challenge: string, msg: string): string {
	const hash = Base64.stringify(sha256(msg + salt))!;

	return Base64.stringify(sha256(hash + challenge))!;
}
