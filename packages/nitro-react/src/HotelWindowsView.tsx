import { CatalogTypeEnum } from '@nitrodevco/nitro-api';

import { isSnowWarHidingHotel, useSnowWarStore } from '#base/context/snowwar';
import { useWindowVisibility } from '#base/hooks';

import { AvatarEditorComponent, CatalogWrapper, FriendListWrapper, InventoryComponent, MysteryBoxToolbarExtensionComponent, NavigatorComponent, NavigatorRoomEventInfoComponent, ToolbarChatSettingsComponent, ToolbarOtherSettingsComponent, ToolbarSoundSettingsComponent, ToolbarWordFilterComponent, WalletComponent, WiredChestComponent, WiredContractComponent, WiredLinkComponent, WiredMenuComponent, WiredRewardNotificationsComponent, WiredSelfDonationComponent, WiredSetupComponent, WiredTransactionsComponent } from './components';
import { AchievementsComponent } from './components/achievements';
import { TargetedOfferComponent } from './components/catalog/TargetedOfferComponent';
import { CollectiblesComponent } from './components/collectibles';
import { CursedDragonAdoptionComponent } from './components/cursed-dragon-adoption';
import { EarningsComponent } from './components/earnings';
import { GroupCreatedComponent, GroupHcRequiredComponent, GroupInfoComponent, GroupManagementComponent, GroupMembersComponent, GroupRoomInfoComponent } from './components/groups';
import { HabbiconsComponent } from './components/habbicons';
import { HelpComponent } from './components/help';
import { ModerationComponent } from './components/moderation';
import { EpicPopupComponent, MotdNotificationComponent } from './components/notifications';
import { OfferCenterComponent } from './components/offer-center';
import { QuestsComponent, QuestTrackerComponent } from './components/quests';
import { RoomEffectsWidget } from './components/room/widgets/effects/RoomEffectsWidget';
import { RoomSettingsWidget } from './components/room/widgets/room-settings';
import { SpecialItemsComponent } from './components/special-items';
import { UserProfileComponent } from './components/user-profile';
import { Box } from './theme';
import { BadgeLeaderboardView } from './views/badge-leaderboard/BadgeLeaderboardView';
import { MallOfferMinimizedView } from './views/catalog/targeted-offers/MallOfferMinimizedView';
import { TargetedOfferMinimizedView } from './views/catalog/targeted-offers/TargetedOfferMinimizedView';
import { ClientModuleWindowsView } from './views/client-modules/ClientModuleWindowsView';
import { DailyTasksView } from './views/daily-tasks/DailyTasksView';
import { GroupForumDialogs } from './views/group-forums/GroupForumDialogs';
import { GroupForumView } from './views/group-forums/GroupForumView';
import { HabboPagesView } from './views/habbo-pages/HabboPagesView';
import { NameChangeView } from './views/help/NameChangeView';
import { MessengerView } from './views/messenger/MessengerView';
import { ClubGiftNotificationView } from './views/notifications/ClubGiftNotificationView';
import { NewFeatureNotificationsView } from './views/notifications/NewFeatureNotificationView';
import { NotificationPopupsView } from './views/notifications/NotificationPopupsView';
import { NotificationsExtensionAnchor } from './views/notifications/NotificationsExtensionAnchor';
import { NotificationsView } from './views/notifications/NotificationsView';
import { SafetyLockedNotificationView } from './views/notifications/SafetyLockedNotificationView';
import { NoobLobbyOfferView } from './views/onboarding/NoobLobbyOfferView';
import { NuxGiftSelectionView } from './views/onboarding/NuxGiftSelectionView';
import { ActivityPointsView } from './views/purse/ActivityPointsView';
import { PurseTemplateView } from './views/purse/PurseTemplateView';
import { RewardTrackPremiumConfirmationView } from './views/reward-track/RewardTrackPremiumConfirmationView';
import { RewardTrackView } from './views/reward-track/RewardTrackView';
import { CameraPhotoLabView } from './views/room-widgets/camera/CameraPhotoLabView';
import { CameraView } from './views/room-widgets/camera/CameraView';
import { PhotoPurchaseConfirmationView } from './views/room-widgets/camera/PhotoPurchaseConfirmationView';
import { RoomChatInputView } from './views/room-widgets/chat-input/RoomChatInputView';
import { PetTrainingView } from './views/room-widgets/pet-training/PetTrainingView';
import { SnowWarWindowsView } from './views/snowwar/SnowWarWindowsView';
import { TemplatePreviewView } from './views/system/TemplatePreviewView';
import { ClubDiscountPromoView } from './views/toolbar/ClubDiscountPromoView';
import { ToolbarView } from './views/toolbar/ToolbarView';
import { VipQuestsPromoView } from './views/toolbar/VipQuestsPromoView';

export const HotelWindowsView = () => {
    const { isWindowVisible: isMessengerVisible } = useWindowVisibility('messenger');
    const hidden = useSnowWarStore(isSnowWarHidingHotel);

    return (
                <Box
                    visible={!hidden}
                    sortableChildren
                    pointerTransparent
                    layout={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
                >
                    {/*
                      * `extension_grid`: a 192 wide itemlist at `desktop.width - 192 - 3`. The list only stacks its windows,
                      * each keeps its own x - 0 for every docked window (the 195 wide ones overhang on the right), -38 for the
                      * purse. The box takes the purse's 38 in as padding, so the purse stays inside the box it is hit-tested in.
                      */}
                    <Box layout={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        marginRight: 3,
                        width: 230,
                        paddingLeft: 38,
                        flex: 1,
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                    }}
                    >
                        <PurseTemplateView />
                        <Box layout={{
                            flex: 1,
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            width: 192,
                        }}
                        >
                            <ActivityPointsView />
                            {/* `club_promo` (priority 10) docks above the targeted offer (13); `vip_quests` (10) detaches it and docks there. */}
                            <ClubDiscountPromoView />
                            <VipQuestsPromoView />
                            {/* `targeted_offer` (13): the targeted offer's or the Habbo Mall offer's, whichever is up. */}
                            <TargetedOfferMinimizedView />
                            <MallOfferMinimizedView />
                            {/* `SingularNotificationController`'s extensions, docked at the end of the column. */}
                            <SafetyLockedNotificationView />
                            <ClubGiftNotificationView />
                            <NewFeatureNotificationsView />
                        </Box>
                        {/* `MysteryBoxToolbarExtension` docks `mystery_box` at the column's end as the first room opens, before the banner and event card. */}
                        <MysteryBoxToolbarExtensionComponent />
                        {/* `GroupRoomInfoCtrl` docks the banner in this column, before the quest tracker and the event card. */}
                        <GroupRoomInfoComponent />
                        {/* `RoomEventInfoCtrl` docks the room's event card here, under the group banner and over the quest trackers. */}
                        <NavigatorRoomEventInfoComponent />
                        {/* `QuestController`'s trackers dock here, after the group banner and the event card. */}
                        <QuestTrackerComponent />
                        <NotificationsExtensionAnchor />
                    </Box>
                    <AvatarEditorComponent />
                    <TemplatePreviewView />
                    <CatalogWrapper catalogType={CatalogTypeEnum.Normal} />
                    <CatalogWrapper catalogType={CatalogTypeEnum.BuildersClub} />
                    <InventoryComponent />
                    <FriendListWrapper />
                    <NavigatorComponent />
                    {isMessengerVisible && <MessengerView />}
                    {/* `RoomSettingsCtrl` is the navigator's, not the room's: it also edits a room you are not in. */}
                    <RoomSettingsWidget />
                    <WalletComponent />
                    <WiredSetupComponent />
                    <WiredMenuComponent />
                    <WiredLinkComponent />
                    <WiredChestComponent />
                    <WiredContractComponent />
                    <WiredTransactionsComponent />
                    <WiredSelfDonationComponent />
                    <WiredRewardNotificationsComponent />
                    <EarningsComponent />
                    <AchievementsComponent />
                    <QuestsComponent />
                    <SpecialItemsComponent />
                    <CursedDragonAdoptionComponent />
                    <HelpComponent />
                    <ModerationComponent />
                    <GroupInfoComponent />
                    <GroupMembersComponent />
                    <GroupManagementComponent />
                    <GroupCreatedComponent />
                    <GroupHcRequiredComponent />
                    {/* `GroupForumController`'s window: drawn only while open. */}
                    <GroupForumView />
                    <GroupForumDialogs />
                    {/* `CameraWidget`'s viewfinder: drawn only while shown, its photos kept. */}
                    <CameraView />
                    <CameraPhotoLabView />
                    <PhotoPurchaseConfirmationView />
                    {/* `DailyTasksController`'s two windows: drawn only while shown. */}
                    <DailyTasksView />
                    {/* `BadgeLeaderboardController`: drawn only while shown. */}
                    <BadgeLeaderboardView />
                    {/* `RewardTrackController`'s track window and its premium confirmation: drawn only while shown. */}
                    <RewardTrackView />
                    <RewardTrackPremiumConfirmationView />
                    {/* `HabboNuxDialogs`' new user lobby offer: drawn only while shown. */}
                    <NoobLobbyOfferView />
                    {/* `HabboNuxDialogs`' new user gift selection: drawn only while offered. */}
                    <NuxGiftSelectionView />
                    {/* `HabboPagesViewer`: drawn only while shown. */}
                    <HabboPagesView />
                    {/* `PetCommandTool`: drawn only while shown. */}
                    <PetTrainingView />
                    {/* `NameChangeView`: drawn only while shown. */}
                    <NameChangeView />
                    {/* The client modules' windows: drawn only while open. */}
                    <ClientModuleWindowsView />
                    <UserProfileComponent />
                    <CollectiblesComponent />
                    <HabbiconsComponent />
                    <OfferCenterComponent />
                    <TargetedOfferComponent />
                    <ToolbarView />
                    <ToolbarOtherSettingsComponent />
                    <ToolbarSoundSettingsComponent />
                    <ToolbarChatSettingsComponent />
                    <ToolbarWordFilterComponent />
                    {/* Drawn after the toolbar because it sits inside it when it fits; it renders nothing outside a room. */}
                    <RoomChatInputView />
                    {/* `EffectsWidget` is a window on this desktop, activated when it opens: over the toolbar and the chat input, which it sits beside. */}
                    <RoomEffectsWidget />
                    <NotificationsView />
                    <MotdNotificationComponent />
                    <EpicPopupComponent />
                    <NotificationPopupsView />
                    <SnowWarWindowsView />
                </Box>
    );
};
