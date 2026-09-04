import { findByName, findByProps } from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { findInReactTree } from "@vendetta/utils";

let unpatches: (() => void)[] = [];

export default {
    onLoad: () => {
        console.log("[HideAddFriend] Plugin is loading...");

        // STRATEGY 1: Directly intercept known friend action components and return null
        const FriendAction = findByProps("UserProfileFriendAction");
        if (FriendAction && typeof FriendAction.UserProfileFriendAction === "function") {
            console.log("[HideAddFriend] Found UserProfileFriendAction module, patching directly.");
            unpatches.push(after("UserProfileFriendAction", FriendAction, () => {
                console.log("[HideAddFriend] Intercepted UserProfileFriendAction render, returning null.");
                return null;
            }));
        } else {
            console.log("[HideAddFriend] UserProfileFriendAction module not found.");
        }

        const AddFriendButton = findByName("AddFriendButton", false);
        if (AddFriendButton) {
            console.log("[HideAddFriend] Found AddFriendButton component, patching.");
            unpatches.push(after("default", AddFriendButton, () => {
                console.log("[HideAddFriend] Intercepted AddFriendButton render, returning null.");
                return null;
            }));
        }

        // STRATEGY 2: Intercept all possible profile wrapper layouts
        const ActionModules = [
            { name: "UserProfilePrimaryActions", mod: findByName("UserProfilePrimaryActions", false) },
            { name: "BiteSizeProfilePopout", mod: findByName("BiteSizeProfilePopout", false) },
            { name: "UserProfilePopout", mod: findByName("UserProfilePopout", false) },
            { name: "UserProfileHeaderPrimaryActions", mod: findByName("UserProfileHeaderPrimaryActions", false) },
            { name: "GuildUserProfilePrimaryActions", mod: findByName("GuildUserProfilePrimaryActions", false) }
        ];

        for (const { name, mod } of ActionModules) {
            if (!mod) {
                console.log(`[HideAddFriend] Module not found: ${name}`);
                continue;
            }

            console.log(`[HideAddFriend] Successfully hooked module: ${name}`);

            try {
                const patch = after("default", mod, (args: any, res: any) => {
                    if (!res) {
                        console.log(`[HideAddFriend] Render result for ${name} was empty/null.`);
                        return;
                    }

                    let removedCount = 0;

                    const prune = (node: any) => {
                        if (!node?.props) return;
                        
                        if (Array.isArray(node.props.children)) {
                            node.props.children = node.props.children.filter((child: any) => {
                                const isFriendButton = findInReactTree(child, (n: any) => {
                                    if (!n) return false;
                                    
                                    const type = typeof n.actionType === "string" ? n.actionType : "";
                                    const icon = typeof n.icon === "string" ? n.icon : (typeof n.source === "string" ? n.source : "");
                                    const text = typeof n.text === "string" ? n.text : (typeof n.label === "string" ? n.label : "");
                                    
                                    const matched = type.includes("ADD_FRIEND") || 
                                                    icon.includes("AddFriend") || 
                                                    text.includes("Add Friend") || 
                                                    text.includes("Send Friend Request");
                                    
                                    if (matched) {
                                        console.log(`[HideAddFriend] Match found! Type: "${type}", Icon: "${icon}", Text: "${text}"`);
                                    }
                                    return matched;
                                });

                                if (isFriendButton) {
                                    removedCount++;
                                    return false; // Filter it out
                                }
                                return true;
                            });
                            
                            node.props.children.forEach(prune);
                        } else if (node.props.children) {
                            prune(node.props.children);
                        }
                    };

                    prune(res);
                    if (removedCount > 0) {
                        console.log(`[HideAddFriend] Successfully pruned ${removedCount} button(s) from ${name}`);
                    }
                });
                unpatches.push(patch);
            } catch (e) {
                console.error(`[HideAddFriend] Failed to patch module ${name}:`, e);
            }
        }
    },
    
    onUnload: () => {
        console.log("[HideAddFriend] Unloading plugin, removing all patches.");
        for (const unpatch of unpatches) unpatch();
        unpatches = [];
    }
}

