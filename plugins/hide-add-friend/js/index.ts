import { findByName, findByProps } from 
"@vendetta/metro"; import { after } from 
"@vendetta/patcher"; import { findInReactTree } 
from "@vendetta/utils"; let unpatches: (() => 
void)[] = []; export default {
    onLoad: () => {
        // Find all known modules that wrap the 
        // profile action buttons
        const ActionModules = [ 
            findByName("UserProfilePrimaryActions", 
            false), 
            findByName("BiteSizeProfilePopout", 
            false), 
            findByName("UserProfilePopout", 
            false), 
            findByName("UserProfileHeaderPrimaryActions", 
            false)
        ]; for (const Module of ActionModules) { 
            if (!Module) continue; try {
                // Hook the default export of 
                // the React component
                const patch = after("default", 
                Module, (args: any, res: any) => 
                {
                    if (!res || !res.props) 
                    return;
                    // Recursive function to 
                    // strip the button before 
                    // it renders
                    const prune = (node: any) => 
                    {
                        if (!node || 
                        !node.props) return;
                        
                        if 
                        (Array.isArray(node.props.children)) 
                        {
                            // Filter out the 
                            // button from 
                            // arrays
                            node.props.children 
                            = 
                            node.props.children.filter((child: 
                            any) => {
                                const 
                                hasAddFriend = 
                                findInReactTree(child, 
                                (n: any) =>
                                    n?.icon === 
                                    "AddFriendIcon" 
                                    ||
                                    n?.text === 
                                    "Add Friend" 
                                    ||
                                    n?.actionType 
                                    === 
                                    "ADD_FRIEND" 
                                    ||
                                    n?.label === 
                                    "Add Friend"
                                ); return 
                                !hasAddFriend;
                            });
                            // Keep searching 
                            // recursively down 
                            // the remaining 
                            // children
                            node.props.children.forEach(prune);
                        } else if 
                        } (node.props.children) 
                        } {
                            // If it's a single 
                            // child, check it 
                            // directly
                            const hasAddFriend = 
                            findInReactTree(node.props.children, 
                            (n: any) =>
                                n?.icon === 
                                "AddFriendIcon" 
                                ||
                                n?.text === "Add 
                                Friend" || 
                                n?.actionType 
                                === "ADD_FRIEND"
                            ); if (hasAddFriend) 
                            {
                                node.props.children 
                                = null; // 
                                Nullify it 
                                completely
                            } else {
                                prune(node.props.children); 
                                // Dig deeper
                            }
                        }
                    };
                    prune(res);
                });
                
                unpatches.push(patch);
            } catch (e) {
                console.error("Failed to apply 
                patch to module:", e);
            }
        }
        
        // Direct strike: If the modern 
        // FriendAction module itself is found, 
        // force it to return null globally
        const FriendAction = 
        findByProps("UserProfileFriendAction"); 
        if (FriendAction && typeof 
        FriendAction.UserProfileFriendAction === 
        "function") {
            unpatches.push( 
                after("UserProfileFriendAction", 
                FriendAction, () => null)
            );
        }
    },
    
    onUnload: () => {
        // Clean up all patches instantly when 
        // the plugin is toggled off
        for (const unpatch of unpatches) { 
            unpatch();
        }
        unpatches = [];
    }
}
