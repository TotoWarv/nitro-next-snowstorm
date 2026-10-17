import { GetFurnitureAliasesComposer, InfoRetrieveComposer } from '@nitrodevco/nitro-packets';
import { GetTicker } from '@nitrodevco/nitro-renderer';
import { useEffect } from 'react';

import { trackEventLog } from '#base/commands';
import { useWebSocketContext } from '#base/context/communication';
import { useConfigValue } from '#base/context/system';

import { RoomWrapper } from './components';
import { HotelViewComponent } from './components/hotel-view';
import { OnboardingComponent } from './components/onboarding';
import { registerHandlers } from './handlers';
import { useRegisterHandlers } from './hooks';
import { HotelWindowsView } from './HotelWindowsView';
import { ModalLayer, TooltipLayer, WindowLayer } from './theme';
import { ClientModuleAvatarOverlaysView } from './views/client-modules/ClientModuleAvatarOverlaysView';
import { HintArrowView } from './views/hints/HintArrowView';
import { SnowWarView } from './views/snowwar/SnowWarView';
import { SystemDialogsView } from './views/system/SystemDialogsView';
import { ViewErrorBoundaries } from './views/system/ViewErrorBoundary';
import { ToolbarTransitionsView } from './views/toolbar/ToolbarTransitionsView';

/**
 * The client once `NitroView` shows it: the room and hotel view under the window layer, which holds
 * every window, the toolbar, the purse and the notifications, with the modal and tooltip layers on
 * top. It registers the connection's packet handlers, applies `fps.limit` to the ticker, and only
 * once the whole tree is mounted asks for the user info and furni aliases and lets the packets queued
 * meanwhile through.
 */
export const MainView = () => {
    const { setReady, send } = useWebSocketContext();
    const maxFPS = useConfigValue<number>('fps.limit') ?? 60;

    // Every connection-lifetime packet handler, attached before the effect below lets the queued packets through.
    useRegisterHandlers(registerHandlers);

    useEffect(() => {
        GetTicker().maxFPS = maxFPS;
    }, [ maxFPS ]);

    /*
     * Effects run children first, so by the time this one runs every listener in the tree below -
     * and the handlers registered above - is attached. Only then are the packets that arrived
     * while the UI was mounting let through.
     */
    useEffect(() => {
        send(new InfoRetrieveComposer({}));
        // `onAuthenticationOK` logs the login, then asks for the furni aliases right after the user object.
        trackEventLog(send, 'Login', 'socket', 'client.auth_ok');
        send(new GetFurnitureAliasesComposer({}));
        setReady();
    }, []);

    return (
        <>
            <ViewErrorBoundaries>
                <RoomWrapper />
                <HotelViewComponent />
            </ViewErrorBoundaries>
            {/* Window context 1's desktop: every window is drawn and ordered in here. */}
            <WindowLayer>
                <ViewErrorBoundaries>
                    {/* What client modules draw over the avatars: over the room, under every window. */}
                    <ClientModuleAvatarOverlaysView />
                    <HotelWindowsView />
                    <SnowWarView />
                    <SystemDialogsView />
                    {/* Context 3: every `ModalDialog` is moved in here, over the windows and their popups. */}
                    <ModalLayer />
                    {/* Desktop 2: the pictures `animateToIcon` flies into the toolbar, over every window. */}
                    <ToolbarTransitionsView />
                    {/* `HintManager`'s arrow at the element a hint key names, over every window. */}
                    <HintArrowView />
                    <TooltipLayer />
                </ViewErrorBoundaries>
            </WindowLayer>
            {/* `HabboLandingView`'s new user flow: over the whole client while it runs. */}
            <ViewErrorBoundaries>
                <OnboardingComponent />
            </ViewErrorBoundaries>
        </>
    );
};
