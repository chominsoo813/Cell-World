import * as Phaser from "phaser";
import {
  getOfficeSheet,
  type OfficeSheetConfig,
} from "@/game/officeRefSheets";
import { useGameStore } from "@/stores/gameStore";

const CELL_WIDTH = 80;
const CELL_HEIGHT = 52;
const WORLD_COLUMNS = 26;
const WORLD_ROWS = 18;
const WORLD_WIDTH = CELL_WIDTH * WORLD_COLUMNS;
const WORLD_HEIGHT = CELL_HEIGHT * WORLD_ROWS;
const HIDE_DURATION = 5000;
const PLAYER_SPEED = 260;
const SECURITY_COLUMN_X = 600;
const REF_BASE = "/assets/pixel-art/office-ref";
const KEEPER_BASE = "/assets/pixel-art/office-escape";
const KEEPER_CHARACTER = `${KEEPER_BASE}/characters`;
const KEEPER_FURNITURE = `${KEEPER_BASE}/furniture`;
type WalkDirection = "front" | "back" | "left" | "right";
type EditTarget =
  | { kind: "column"; index: number }
  | { kind: "row"; index: number };
type HideVisual = Phaser.GameObjects.GameObject & {
  getBounds: () => Phaser.Geom.Rectangle;
  setVisible: (visible: boolean) => unknown;
};
type HideBodyObject = HideVisual;

interface HideTargetGroup {
  bodies: HideBodyObject[];
  targetKey?: string;
  visuals: HideVisual[];
}

interface OfficeKeys {
  copy: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  edit: Phaser.Input.Keyboard.Key;
  execute: Phaser.Input.Keyboard.Key;
  interact: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  paste: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
}

const ASSETS = {
  playerFront: `${KEEPER_CHARACTER}/player_front.png`,
  playerBack: `${KEEPER_CHARACTER}/player_back.png`,
  playerLeft: `${KEEPER_CHARACTER}/player_left.png`,
  playerRight: `${KEEPER_CHARACTER}/player_right.png`,
  coworkerBack: `${REF_BASE}/characters/coworker_back.png`,
  coworkerFront: `${REF_BASE}/characters/coworker_front.png`,
  leaderBack: `${REF_BASE}/characters/team_leader_back.png`,
  guardFront: `${REF_BASE}/characters/security_front.png`,
  guardBack: `${REF_BASE}/characters/security_back.png`,
  playerWalkFront1: `${REF_BASE}/characters/walk/player_front_1.png`,
  playerWalkFront2: `${REF_BASE}/characters/walk/player_front_2.png`,
  playerWalkBack1: `${REF_BASE}/characters/walk/player_back_1.png`,
  playerWalkBack2: `${REF_BASE}/characters/walk/player_back_2.png`,
  playerWalkLeft1: `${REF_BASE}/characters/walk/player_left_1.png`,
  playerWalkLeft2: `${REF_BASE}/characters/walk/player_left_2.png`,
  playerWalkRight1: `${REF_BASE}/characters/walk/player_right_1.png`,
  playerWalkRight2: `${REF_BASE}/characters/walk/player_right_2.png`,
  guardWalkFront1: `${REF_BASE}/characters/walk/security_front_1.png`,
  guardWalkFront2: `${REF_BASE}/characters/walk/security_front_2.png`,
  guardWalkBack1: `${REF_BASE}/characters/walk/security_back_1.png`,
  guardWalkBack2: `${REF_BASE}/characters/walk/security_back_2.png`,
  guardWalkLeft1: `${REF_BASE}/characters/walk/security_left_1.png`,
  guardWalkLeft2: `${REF_BASE}/characters/walk/security_left_2.png`,
  guardWalkRight1: `${REF_BASE}/characters/walk/security_right_1.png`,
  guardWalkRight2: `${REF_BASE}/characters/walk/security_right_2.png`,
  terminal: `${REF_BASE}/props/evaluation_terminal.png`,
  exitLocked: `${REF_BASE}/devices/security_door_locked.png`,
  exitOpen: `${REF_BASE}/devices/security_door_open.png`,
  turnstile: `${REF_BASE}/props/security_turnstile.png`,
  doorway: `${REF_BASE}/environment/doorway_threshold.png`,
  partitionWall: `${KEEPER_FURNITURE}/partition_wall.png`,
  desk: `${KEEPER_FURNITURE}/office_desk.png`,
  chair: `${KEEPER_FURNITURE}/office_chair_green.png`,
  monitor: `${KEEPER_FURNITURE}/computer_monitor.png`,
  conferenceTable: `${KEEPER_FURNITURE}/conference_table_set.png`,
  bookshelf: `${KEEPER_FURNITURE}/bookshelf.png`,
  plant: `${KEEPER_FURNITURE}/potted_plant.png`,
  copier: `${KEEPER_FURNITURE}/copier_printer.png`,
  itemHighlight: `${KEEPER_BASE}/mission-ui/item_highlight.png`,
  contractDocument: `${KEEPER_BASE}/mission-ui/budget_document.png`,
  approvalDocument: `${KEEPER_BASE}/mission-ui/report_document.png`,
  keycard: `${KEEPER_BASE}/mission-ui/keycard.png`,
  cctv: `${REF_BASE}/devices/cctv_camera_active.png`,
  scanner: `${REF_BASE}/props/policy_scanner.png`,
  chargeNode: `${REF_BASE}/props/calc_recharge_node.png`,
  emergencyRelease: `${REF_BASE}/props/approval_stamp.png`,
  filingCabinet: `${REF_BASE}/props/mobile_filing_cabinet.png`,
  sensorPad: `${REF_BASE}/props/sensor_pad.png`,
  projector: `${REF_BASE}/props/meeting_projector.png`,
  serverRack: `${REF_BASE}/props/server_rack.png`,
  rootLock: `${REF_BASE}/props/root_lock.png`,
  saveSlot: `${REF_BASE}/props/local_save_slot.png`,
  waterCooler: `${REF_BASE}/environment/water_cooler.png`,
  managerVlookup: `${REF_BASE}/characters/manager_vlookup_front.png`,
  chiefCountif: `${REF_BASE}/characters/chief_countif_front.png`,
  directorIferror: `${REF_BASE}/characters/director_iferror_front.png`,
  auditorCtrl: `${REF_BASE}/characters/auditor_ctrl_front.png`,
  vpDrop: `${REF_BASE}/characters/vp_drop_front.png`,
} as const;

export class CellOfficeRefScene extends Phaser.Scene {
  private officeSheet: OfficeSheetConfig = getOfficeSheet(1, 1);
  private playerStart = { x: 200, y: 806 };
  private terminalPosition = { x: 1640, y: 806 };
  private exitPosition = { x: 1880, y: 156 };
  private guardStart = { x: 760, y: 520 };
  private guardAxis: "horizontal" | "vertical" = "vertical";
  private guardMinimum = 416;
  private guardMaximum = 624;
  private secondGuardStart = { x: 1040, y: 182 };
  private secondGuardAxis: "horizontal" | "vertical" = "horizontal";
  private secondGuardMinimum = 880;
  private secondGuardMaximum = 1160;
  private player?: Phaser.Physics.Arcade.Sprite;
  private playerShadow?: Phaser.GameObjects.Ellipse;
  private guard?: Phaser.Physics.Arcade.Sprite;
  private guardShadow?: Phaser.GameObjects.Ellipse;
  private secondGuard?: Phaser.Physics.Arcade.Sprite;
  private secondGuardShadow?: Phaser.GameObjects.Ellipse;
  private keys?: OfficeKeys;
  private walls?: Phaser.Physics.Arcade.StaticGroup;
  private hideTargets: HideTargetGroup[] = [];
  private activeHideTargets: HideTargetGroup[] = [];
  private exitDoor?: Phaser.GameObjects.Image;
  private terminal?: Phaser.GameObjects.Image;
  private terminalHighlight?: Phaser.GameObjects.Image;
  private contractDocument?: Phaser.GameObjects.Image;
  private contractHighlight?: Phaser.GameObjects.Image;
  private rechargeNode?: Phaser.GameObjects.Image;
  private rechargeHighlight?: Phaser.GameObjects.Image;
  private sheet2Cctv?: Phaser.GameObjects.Image;
  private sheet3TrainingTerminal?: Phaser.GameObjects.Image;
  private sheet3TrainingHighlight?: Phaser.GameObjects.Image;
  private sheet3LeaderBadge?: Phaser.GameObjects.Image;
  private sheet3BadgeHighlight?: Phaser.GameObjects.Image;
  private sheet3PasteStation?: Phaser.GameObjects.Image;
  private sheet3SecurityDoor?: Phaser.GameObjects.Image;
  private sheet3SecurityDoorBody?: Phaser.GameObjects.Rectangle;
  private sheet3ApprovalDocument?: Phaser.GameObjects.Image;
  private sheet3ApprovalHighlight?: Phaser.GameObjects.Image;
  private sheet3BadgeTray?: Phaser.GameObjects.Image;
  private copyPasteUnlocked = false;
  private leaderBadgeCopied = false;
  private duplicateBadgeEquipped = false;
  private approvalCarrying = false;
  private approvalSubmitted = false;
  private originalBadgeRestored = false;
  private sheet4Printer?: Phaser.GameObjects.Image;
  private sheet4Cabinet?: Phaser.GameObjects.Image;
  private sheet4PrinterTarget?: Phaser.GameObjects.Image;
  private sheet4CabinetTarget?: Phaser.GameObjects.Image;
  private sheet4EmergencyRelease?: Phaser.GameObjects.Image;
  private sheet4AdminDoor?: Phaser.GameObjects.Image;
  private sheet4AdminDoorBody?: Phaser.GameObjects.Rectangle;
  private sheet4Colleague?: Phaser.GameObjects.Image;
  private sheet4ColleagueHighlight?: Phaser.GameObjects.Image;
  private sheet4Facilities: Phaser.GameObjects.Image[] = [];
  private sheet4Cctvs: Phaser.GameObjects.Image[] = [];
  private sheet4Clipboard: "cabinet" | "printer" | null = null;
  private sheet4PrinterDuplicated = false;
  private sheet4CabinetDuplicated = false;
  private sheet4CctvDisabled = false;
  private sheet4AdminDoorOpen = false;
  private sheet4ColleagueRescued = false;
  private finalProjectBonus?: Phaser.GameObjects.Image;
  private finalProjectHighlight?: Phaser.GameObjects.Image;
  private finalBorrowTarget?: Phaser.GameObjects.Image;
  private finalBorrowedResult?: Phaser.GameObjects.Image;
  private finalSubmitTerminal?: Phaser.GameObjects.Image;
  private finalRechargeNode?: Phaser.GameObjects.Image;
  private finalManager?: Phaser.GameObjects.Image;
  private finalCctvs: Phaser.GameObjects.Image[] = [];
  private finalScoreLabel?: Phaser.GameObjects.Text;
  private finalManagerLabel?: Phaser.GameObjects.Text;
  private finalBonusCopied = false;
  private finalBonusPasted = false;
  private finalRechargeUsed = false;
  private finalWorkPenalty = 0;
  private finalManagerActionIndex = 0;
  private finalManagerNextActionAt = 8000;
  private finalBonusLockedUntil = 0;
  private finalLastManagerSecond = -1;
  private s2s1TrainingTerminal?: Phaser.GameObjects.Image;
  private s2s1TrainingHighlight?: Phaser.GameObjects.Image;
  private s2s1SortStation?: Phaser.GameObjects.Image;
  private s2s1QueueEntries: Array<{
    container: Phaser.GameObjects.Container;
    name: string;
    originalIndex: number;
    rank: number | null;
  }> = [];
  private s2s1Gate?: Phaser.GameObjects.Image;
  private s2s1GateBody?: Phaser.GameObjects.Rectangle;
  private s2s1Request?: Phaser.GameObjects.Image;
  private s2s1RequestHighlight?: Phaser.GameObjects.Image;
  private s2s1Outbox?: Phaser.GameObjects.Image;
  private s2s1SortUnlocked = false;
  private s2s1SortPreviewed = false;
  private s2s1QueueValid = false;
  private s2s1RequestCarrying = false;
  private s2s1RequestSubmitted = false;
  private s2s2SortStation?: Phaser.GameObjects.Image;
  private s2s2QueueEntries: Array<{
    container: Phaser.GameObjects.Container;
    departmentCode: number | null;
    name: string;
    originalIndex: number;
  }> = [];
  private s2s2Gate?: Phaser.GameObjects.Image;
  private s2s2GateBody?: Phaser.GameObjects.Rectangle;
  private s2s2Request?: Phaser.GameObjects.Image;
  private s2s2RequestHighlight?: Phaser.GameObjects.Image;
  private s2s2Outbox?: Phaser.GameObjects.Image;
  private s2s2Cctv?: Phaser.GameObjects.Image;
  private s2s2SortPreviewed = false;
  private s2s2QueueValid = false;
  private s2s2RequestCarrying = false;
  private s2s2RequestSubmitted = false;
  private s2s3FilterStation?: Phaser.GameObjects.Image;
  private s2s3TrainingTerminal?: Phaser.GameObjects.Image;
  private s2s3QueueEntries: Array<{
    container: Phaser.GameObjects.Container;
    clearance: number | null;
    name: string;
    qualified: boolean;
  }> = [];
  private s2s3LateStaff?: Phaser.GameObjects.Container;
  private s2s3Gate?: Phaser.GameObjects.Image;
  private s2s3GateBody?: Phaser.GameObjects.Rectangle;
  private s2s3Patch?: Phaser.GameObjects.Image;
  private s2s3PatchHighlight?: Phaser.GameObjects.Image;
  private s2s3Outbox?: Phaser.GameObjects.Image;
  private s2s3RechargeNode?: Phaser.GameObjects.Image;
  private s2s3Cctv?: Phaser.GameObjects.Image;
  private s2s3FilterPreviewed = false;
  private s2s3FilterUnlocked = false;
  private s2s3FilterActive = false;
  private s2s3FilterUntil = 0;
  private s2s3LateStaffAt = 0;
  private s2s3LateStaffSpawned = false;
  private s2s3PatchCarrying = false;
  private s2s3PatchSubmitted = false;
  private s2s4DispatchTerminal?: Phaser.GameObjects.Image;
  private s2s4DispatchHighlight?: Phaser.GameObjects.Image;
  private s2s4WriteConsole?: Phaser.GameObjects.Image;
  private s2s4QueueEntries: Array<{
    container: Phaser.GameObjects.Container;
    name: string;
    originalIndex: number;
    priority: number;
    role: "TEAM_LEADER" | "FACILITIES";
  }> = [];
  private s2s4ProcessMarker?: Phaser.GameObjects.Image;
  private s2s4ProcessHighlight?: Phaser.GameObjects.Image;
  private s2s4Leader?: Phaser.GameObjects.Image;
  private s2s4LeaderHome = { x: 1180, y: 260 };
  private s2s4Gate?: Phaser.GameObjects.Image;
  private s2s4GateBody?: Phaser.GameObjects.Rectangle;
  private s2s4Cctv?: Phaser.GameObjects.Image;
  private s2s4ViolationLabel?: Phaser.GameObjects.Text;
  private s2s4WriteUnlocked = false;
  private s2s4WriteUntil = 0;
  private s2s4Filtered = false;
  private s2s4FilterPreviewed = false;
  private s2s4Sorted = false;
  private s2s4SortPreviewed = false;
  private s2s4Dispatched = false;
  private s2s4Processed = false;
  private s2fAuditStation?: Phaser.GameObjects.Image;
  private s2fRechargeNode?: Phaser.GameObjects.Image;
  private s2fRows: Array<{
    container: Phaser.GameObjects.Container;
    date: "TODAY" | "YESTERDAY";
    id: number;
    owner: string;
    status: "COMPLIANT" | "VIOLATION";
    visible: boolean;
  }> = [];
  private s2fSubmitTerminal?: Phaser.GameObjects.Image;
  private s2fSubmitHighlight?: Phaser.GameObjects.Image;
  private s2fGate?: Phaser.GameObjects.Image;
  private s2fGateBody?: Phaser.GameObjects.Rectangle;
  private s2fChief?: Phaser.GameObjects.Image;
  private s2fChiefLabel?: Phaser.GameObjects.Text;
  private s2fVerdictLabel?: Phaser.GameObjects.Text;
  private s2fCctv?: Phaser.GameObjects.Image;
  private s2fFiltered = false;
  private s2fFilterPreviewed = false;
  private s2fSorted = false;
  private s2fSortPreviewed = false;
  private s2fSampleValid = false;
  private s2fSampleUntil = 0;
  private s2fSubmitted = false;
  private s2fChiefActionIndex = 0;
  private s2fChiefNextAt = 10000;
  private s2fChiefLastSecond = -1;
  private s3s1IfTerminal?: Phaser.GameObjects.Image;
  private s3s1IfHighlight?: Phaser.GameObjects.Image;
  private s3s1InstallConsole?: Phaser.GameObjects.Image;
  private s3s1CoffeeButton?: Phaser.GameObjects.Image;
  private s3s1CoffeeHighlight?: Phaser.GameObjects.Image;
  private s3s1Employee?: Phaser.GameObjects.Image;
  private s3s1EmployeeHome = { x: 460, y: 182 };
  private s3s1ConditionCell?: Phaser.GameObjects.Rectangle;
  private s3s1Door?: Phaser.GameObjects.Image;
  private s3s1DoorBody?: Phaser.GameObjects.Rectangle;
  private s3s1TriggerLine?: Phaser.GameObjects.Line;
  private s3s1ResultLine?: Phaser.GameObjects.Line;
  private s3s1StatusLabel?: Phaser.GameObjects.Text;
  private s3s1Log?: Phaser.GameObjects.Image;
  private s3s1LogHighlight?: Phaser.GameObjects.Image;
  private s3s1Outbox?: Phaser.GameObjects.Image;
  private s3s1IfUnlocked = false;
  private s3s1IfInstalled = false;
  private s3s1IfPreviewed = false;
  private s3s1CoffeeCalled = false;
  private s3s1Triggered = false;
  private s3s1LogCarrying = false;
  private s3s1LogSubmitted = false;
  private s3s2ConsoleA?: Phaser.GameObjects.Image;
  private s3s2ConsoleB?: Phaser.GameObjects.Image;
  private s3s2Printer?: Phaser.GameObjects.Image;
  private s3s2Door1?: Phaser.GameObjects.Image;
  private s3s2Door1Body?: Phaser.GameObjects.Rectangle;
  private s3s2Door2?: Phaser.GameObjects.Image;
  private s3s2Door2Body?: Phaser.GameObjects.Rectangle;
  private s3s2RechargeNode?: Phaser.GameObjects.Image;
  private s3s2Worker?: Phaser.GameObjects.Image;
  private s3s2WorkerHome = { x: 840, y: 182 };
  private s3s2ConditionCell?: Phaser.GameObjects.Rectangle;
  private s3s2RepairButton?: Phaser.GameObjects.Image;
  private s3s2RepairHighlight?: Phaser.GameObjects.Image;
  private s3s2ResultLine?: Phaser.GameObjects.Line;
  private s3s2StatusLabel?: Phaser.GameObjects.Text;
  private s3s2Template?: Phaser.GameObjects.Image;
  private s3s2TemplateHighlight?: Phaser.GameObjects.Image;
  private s3s2Outbox?: Phaser.GameObjects.Image;
  private s3s2Cctv?: Phaser.GameObjects.Image;
  private s3s2If1Installed = false;
  private s3s2If1Previewed = false;
  private s3s2If2Installed = false;
  private s3s2If2Previewed = false;
  private s3s2RepairCalled = false;
  private s3s2Triggered = false;
  private s3s2TemplateCarrying = false;
  private s3s2TemplateSubmitted = false;
  private readonly s3s3CellX = [440, 520, 600, 680, 760];
  private readonly s3s3RowY = 182;
  private s3s3IfConsole?: Phaser.GameObjects.Image;
  private s3s3IfHighlight?: Phaser.GameObjects.Image;
  private s3s3Document?: Phaser.GameObjects.Image;
  private s3s3Sensor?: Phaser.GameObjects.Rectangle;
  private s3s3Door?: Phaser.GameObjects.Image;
  private s3s3DoorBody?: Phaser.GameObjects.Rectangle;
  private s3s3ResultLine?: Phaser.GameObjects.Line;
  private s3s3StatusLabel?: Phaser.GameObjects.Text;
  private s3s3Template?: Phaser.GameObjects.Image;
  private s3s3TemplateHighlight?: Phaser.GameObjects.Image;
  private s3s3Outbox?: Phaser.GameObjects.Image;
  private s3s3Cctv?: Phaser.GameObjects.Image;
  private s3s3IfInstalled = false;
  private s3s3IfPreviewed = false;
  private s3s3IfEditing = false;
  private s3s3ConveyorStarted = false;
  private s3s3DocIndex = 0;
  private s3s3DocTimer = 0;
  private s3s3DocAtSensor = false;
  private s3s3DoorOpenUntil = 0;
  private s3s3Passed = false;
  private s3s3TemplateCarrying = false;
  private s3s3TemplateSubmitted = false;
  private prompt?: Phaser.GameObjects.Text;
  private formulaPanel?: Phaser.GameObjects.Container;
  private formulaTitle?: Phaser.GameObjects.Text;
  private formulaLabel?: Phaser.GameObjects.Text;
  private inspectionLabel?: Phaser.GameObjects.Text;
  private executeLabel?: Phaser.GameObjects.Text;
  private columnSelection?: Phaser.GameObjects.Rectangle;
  private hideUntil = 0;
  private editMode = false;
  private selectedEditTarget: EditTarget = { kind: "column", index: 7 };
  private rowInput = "";
  private rowInputAt = 0;
  private previewArmed = false;
  private terminalChecked = false;
  private exitUnlocked = false;
  private calc = 5;
  private guardDirection: 1 | -1 = 1;
  private secondGuardDirection: 1 | -1 = -1;
  private carryingContract = false;
  private contractSubmitted = false;
  private rechargeUsed = false;
  private usedRow6 = false;
  private usedColumnJ = false;
  private playerFacing: WalkDirection = "front";
  private lastHideSecond = -1;
  private lastAlertAt = -2000;
  private runStatus: "playing" | "won" = "playing";

  constructor() {
    super("cell-office-ref");
  }

  preload() {
    for (const [key, path] of Object.entries(ASSETS)) {
      this.load.image(`office-ref-${key}`, path);
    }
  }

  create() {
    this.resetRuntime();
    const state = useGameStore.getState();
    this.officeSheet = getOfficeSheet(state.keeperLevel, state.keeperSheet);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.drawWorkbookFloor();
    this.walls = this.physics.add.staticGroup();
    this.buildCompanyLayout();
    this.createWalkAnimations();
    this.createPlayer();
    this.createGuard();
    this.createMissionObjects();
    this.createFormulaPanel();
    this.createInput();
    this.resizeCamera(this.scale.width, this.scale.height);
    this.scale.on("resize", (size: Phaser.Structs.Size) => {
      this.resizeCamera(size.width, size.height);
    });

    useGameStore.getState().updateKeeper({
      alerts: 0,
      calc: 5,
      exitUnlocked: false,
      hideActive: false,
      hideRemaining: 0,
      status: "playing",
      terminalChecked: false,
    });
    useGameStore.getState().setSelectedCell(
      this.cellAt(this.playerStart.x, this.playerStart.y),
      `=OPEN("${this.officeSheet.workbook}")`,
    );
  }

  update(time: number, delta: number) {
    if (!this.player || !this.keys || this.runStatus !== "playing") return;

    this.updateHide(time);
    this.updateMovement();
    this.updateGuard(time, delta);
    this.updateInteractionPrompt();

    if (Phaser.Input.Keyboard.JustDown(this.keys.edit) && this.hideUntil <= time) {
      this.setEditMode(!this.editMode);
    }
    if (this.editMode && Phaser.Input.Keyboard.JustDown(this.keys.execute)) {
      this.confirmEdit(time);
    }
    if (!this.editMode && Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
      this.interact();
    }
    if (!this.editMode && Phaser.Input.Keyboard.JustDown(this.keys.copy)) {
      this.copyContextObject();
    }
    if (!this.editMode && Phaser.Input.Keyboard.JustDown(this.keys.paste)) {
      this.pasteContextObject();
    }
  }

  private resetRuntime() {
    this.hideTargets = [];
    this.activeHideTargets = [];
    this.hideUntil = 0;
    this.editMode = false;
    this.selectedEditTarget = { kind: "column", index: 7 };
    this.rowInput = "";
    this.rowInputAt = 0;
    this.previewArmed = false;
    this.terminalChecked = false;
    this.exitUnlocked = false;
    this.calc = 5;
    this.guardDirection = 1;
    this.secondGuardDirection = -1;
    this.carryingContract = false;
    this.contractSubmitted = false;
    this.rechargeUsed = false;
    this.usedRow6 = false;
    this.usedColumnJ = false;
    this.copyPasteUnlocked = false;
    this.leaderBadgeCopied = false;
    this.duplicateBadgeEquipped = false;
    this.approvalCarrying = false;
    this.approvalSubmitted = false;
    this.originalBadgeRestored = false;
    this.sheet4Facilities = [];
    this.sheet4Cctvs = [];
    this.sheet4Clipboard = null;
    this.sheet4PrinterDuplicated = false;
    this.sheet4CabinetDuplicated = false;
    this.sheet4CctvDisabled = false;
    this.sheet4AdminDoorOpen = false;
    this.sheet4ColleagueRescued = false;
    this.finalCctvs = [];
    this.finalBonusCopied = false;
    this.finalBonusPasted = false;
    this.finalRechargeUsed = false;
    this.finalWorkPenalty = 0;
    this.finalManagerActionIndex = 0;
    this.finalManagerNextActionAt = 8000;
    this.finalBonusLockedUntil = 0;
    this.finalLastManagerSecond = -1;
    this.s2s1QueueEntries = [];
    this.s2s1SortUnlocked = false;
    this.s2s1SortPreviewed = false;
    this.s2s1QueueValid = false;
    this.s2s1RequestCarrying = false;
    this.s2s1RequestSubmitted = false;
    this.s2s2QueueEntries = [];
    this.s2s2SortPreviewed = false;
    this.s2s2QueueValid = false;
    this.s2s2RequestCarrying = false;
    this.s2s2RequestSubmitted = false;
    this.s2s3QueueEntries = [];
    this.s2s3FilterPreviewed = false;
    this.s2s3FilterUnlocked = false;
    this.s2s3FilterActive = false;
    this.s2s3FilterUntil = 0;
    this.s2s3LateStaffAt = 0;
    this.s2s3LateStaffSpawned = false;
    this.s2s3PatchCarrying = false;
    this.s2s3PatchSubmitted = false;
    this.s2s4QueueEntries = [];
    this.s2s4WriteUnlocked = false;
    this.s2s4WriteUntil = 0;
    this.s2s4Filtered = false;
    this.s2s4FilterPreviewed = false;
    this.s2s4Sorted = false;
    this.s2s4SortPreviewed = false;
    this.s2s4Dispatched = false;
    this.s2s4Processed = false;
    this.s2fRows = [];
    this.s2fFiltered = false;
    this.s2fFilterPreviewed = false;
    this.s2fSorted = false;
    this.s2fSortPreviewed = false;
    this.s2fSampleValid = false;
    this.s2fSampleUntil = 0;
    this.s2fSubmitted = false;
    this.s2fChiefActionIndex = 0;
    this.s2fChiefNextAt = 10000;
    this.s2fChiefLastSecond = -1;
    this.s3s1IfUnlocked = false;
    this.s3s1IfInstalled = false;
    this.s3s1IfPreviewed = false;
    this.s3s1CoffeeCalled = false;
    this.s3s1Triggered = false;
    this.s3s1LogCarrying = false;
    this.s3s1LogSubmitted = false;
    this.s3s2If1Installed = false;
    this.s3s2If1Previewed = false;
    this.s3s2If2Installed = false;
    this.s3s2If2Previewed = false;
    this.s3s2RepairCalled = false;
    this.s3s2Triggered = false;
    this.s3s2TemplateCarrying = false;
    this.s3s2TemplateSubmitted = false;
    this.s3s3IfInstalled = false;
    this.s3s3IfPreviewed = false;
    this.s3s3IfEditing = false;
    this.s3s3ConveyorStarted = false;
    this.s3s3DocIndex = 0;
    this.s3s3DocTimer = 0;
    this.s3s3DocAtSensor = false;
    this.s3s3DoorOpenUntil = 0;
    this.s3s3Passed = false;
    this.s3s3TemplateCarrying = false;
    this.s3s3TemplateSubmitted = false;
    this.playerFacing = "front";
    this.lastHideSecond = -1;
    this.runStatus = "playing";
  }

  private drawWorkbookFloor() {
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0xdce4df);
    const grid = this.add.graphics().lineStyle(1, 0x6f8982, 0.18);
    for (let x = 0; x <= WORLD_WIDTH; x += CELL_WIDTH) {
      grid.lineBetween(x, 0, x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += CELL_HEIGHT) {
      grid.lineBetween(0, y, WORLD_WIDTH, y);
    }

    this.add.rectangle(200, 52, 400, 104, 0xf4f7f1, 0.92).setStrokeStyle(2, 0x8ca39a);
    this.add.text(24, 22, `SESSION ${this.officeSheet.session} · ${this.officeSheet.sheet === 5 ? "FINAL SHEET" : `SHEET ${this.officeSheet.sheet}`}`, {
      color: "#285044",
      fontFamily: "monospace",
      fontSize: "24px",
      fontStyle: "bold",
    });
    this.add.text(24, 58, `${this.officeSheet.title} / ${this.officeSheet.workbook}`, {
      color: "#43645d",
      fontFamily: "sans-serif",
      fontSize: "19px",
    });
  }

  private buildCompanyLayout() {
    this.addWall(8, WORLD_HEIGHT / 2, 16, WORLD_HEIGHT);
    this.addWall(WORLD_WIDTH - 8, WORLD_HEIGHT / 2, 16, WORLD_HEIGHT);
    this.addWall(WORLD_WIDTH / 2, 8, WORLD_WIDTH, 16);
    this.addWall(WORLD_WIDTH / 2, WORLD_HEIGHT - 8, WORLD_WIDTH, 16);
    if (this.isSession1Sheet2()) {
      this.buildSession1Sheet2Layout();
    } else if (this.isSession1Sheet3()) {
      this.buildSession1Sheet3Layout();
    } else if (this.isSession1Sheet4()) {
      this.buildSession1Sheet4Layout();
    } else if (this.isSession1Final()) {
      this.buildSession1FinalLayout();
    } else if (this.isSession2Sheet1()) {
      this.buildSession2Sheet1Layout();
    } else if (this.isSession2Sheet2()) {
      this.buildSession2Sheet2Layout();
    } else if (this.isSession2Sheet3()) {
      this.buildSession2Sheet3Layout();
    } else if (this.isSession2Sheet4()) {
      this.buildSession2Sheet4Layout();
    } else if (this.isSession2Final()) {
      this.buildSession2FinalLayout();
    } else if (this.isSession3Sheet1()) {
      this.buildSession3Sheet1Layout();
    } else if (this.isSession3Sheet2()) {
      this.buildSession3Sheet2Layout();
    } else if (this.isSession3Sheet3()) {
      this.buildSession3Sheet3Layout();
    } else switch (this.officeSheet.layout) {
      case "records":
        this.buildRecordsLayout();
        break;
      case "checkpoint":
        this.buildCheckpointLayout();
        break;
      case "meeting":
        this.buildMeetingLayout();
        break;
      case "audit":
        this.buildAuditLayout();
        break;
      default:
        this.buildOperationsLayout();
    }
    if (
      !this.isSession1Sheet2() &&
      !this.isSession1Sheet3() &&
      !this.isSession1Sheet4() &&
      !this.isSession1Final() &&
      !this.isSession2Sheet1() &&
      !this.isSession2Sheet2() &&
      !this.isSession2Sheet3() &&
      !this.isSession2Sheet4() &&
      !this.isSession2Final() &&
      !this.isSession3Sheet1() &&
      !this.isSession3Sheet2() &&
      !this.isSession3Sheet3()
    ) this.placeSessionProps();
    this.columnSelection = this.add
      .rectangle(SECURITY_COLUMN_X, WORLD_HEIGHT / 2, CELL_WIDTH, WORLD_HEIGHT, 0x61d8ca, 0.06)
      .setStrokeStyle(2, 0x61d8ca, 0.42)
      .setDepth(5)
      .setVisible(false);
  }

  private buildSession1Sheet2Layout() {
    this.configureRoute(
      { x: 120, y: 390 },
      { x: 1160, y: 390 },
      { x: 1240, y: 390 },
      { axis: "horizontal", x: 360, y: 286, minimum: 180, maximum: 620 },
    );
    this.secondGuardStart = { x: 1040, y: 182 };
    this.secondGuardAxis = "horizontal";
    this.secondGuardMinimum = 860;
    this.secondGuardMaximum = 1180;

    // ROW 6 보안 파티션: 북쪽 기록실로 가기 위한 첫 번째 HIDE 대상.
    this.addPartition(320, 286, 620, 22, "ROW_6");
    this.addPartition(910, 286, 540, 22, "ROW_6");
    const rowGate = this.add.image(680, 286, "office-ref-turnstile")
      .setDisplaySize(82, 82).setDepth(8);
    const rowGateBody = this.addWall(680, 286, 62, 70, 0);
    this.registerHideTarget([rowGate], [rowGateBody], "ROW_6");

    // COLUMN J 기록실 벽과 CCTV: ROW 6과 독립적으로 한 번 더 숨겨야 한다.
    this.addPartition(760, 128, 22, 240, "COLUMN_J");
    this.addPartition(760, 590, 22, 672, "COLUMN_J");
    this.sheet2Cctv = this.add.image(760, 220, "office-ref-cctv")
      .setDisplaySize(64, 64).setDepth(9);
    this.registerHideTarget([this.sheet2Cctv], [], "COLUMN_J");

    this.createDeskPod(240, 150, "office-ref-leaderBack");
    this.createDeskPod(500, 150, "office-ref-coworkerBack");
    this.addHideableFurniture(940, 110, "office-ref-bookshelf", 92, 106, 82, 96);
    this.addHideableFurniture(1120, 110, "office-ref-bookshelf", 92, 106, 82, 96);
    this.addHideableFurniture(980, 520, "office-ref-filingCabinet", 72, 80, 62, 68);
    this.addHideableFurniture(1180, 520, "office-ref-copier", 74, 92, 64, 82);
    this.addDoorway(680, 286, false);

    // P열 밖은 같은 층의 일반 업무 구역이지만 이번 시트에서는 LOCKED다.
    this.addPartition(1480, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1660, 180, "office-ref-coworkerBack");
    this.createDeskPod(1920, 180, "office-ref-leaderBack");
    this.createMeetingTable(1760, 520);
    this.addHideableFurniture(1940, 780, "office-ref-bookshelf", 92, 106, 82, 96);
    this.addHideableFurniture(1640, 800, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession1Sheet3Layout() {
    this.configureRoute(
      { x: 120, y: 442 },
      { x: 1080, y: 78 },
      { x: 1320, y: 442 },
      { axis: "vertical", x: 1540, y: 520, minimum: 390, maximum: 720 },
    );

    // 보안문이 있는 북쪽 승인 기록실. K6 한 칸만 정상 출입구다.
    this.addPartition(395, 286, 770, 22, "LOCKED");
    this.addPartition(1030, 286, 300, 22, "LOCKED");
    this.addDoorway(840, 286, false);
    this.addPartition(1200, 200, 22, 400, "LOCKED");
    this.addPartition(1200, 700, 22, 472, "LOCKED");
    this.addDoorway(1200, 442, true);

    // H3 원본 출입증은 유리 파티션 안에 있어 이동할 수 없고 COPY만 가능하다.
    this.addPartition(600, 44, 260, 18, "LOCKED");
    this.addPartition(600, 216, 260, 18, "LOCKED");
    this.addPartition(470, 130, 18, 190, "LOCKED");
    this.addPartition(730, 130, 18, 190, "LOCKED");

    this.createDeskPod(220, 160, "office-ref-leaderBack");
    this.createDeskPod(900, 170, "office-ref-coworkerBack");
    this.createDeskPod(260, 560, "office-ref-coworkerBack");
    this.addHideableFurniture(720, 520, "office-ref-bookshelf", 92, 106, 82, 96);
    this.addHideableFurniture(1080, 520, "office-ref-filingCabinet", 72, 80, 62, 68);

    // Q열 밖은 같은 층의 일반 업무 구역이며 이번 퍼즐에서는 잠겨 있다.
    this.addPartition(1400, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1600, 210, "office-ref-coworkerBack");
    this.createDeskPod(1900, 210, "office-ref-leaderBack");
    this.createMeetingTable(1760, 540);
    this.addHideableFurniture(1940, 800, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession1Sheet4Layout() {
    this.configureRoute(
      { x: 120, y: 494 },
      { x: 1160, y: 130 },
      { x: 1320, y: 494 },
      { axis: "horizontal", x: 700, y: 598, minimum: 520, maximum: 980 },
    );

    // 북쪽 회의·지원 구역의 관리문. 프린터 시설 업무나 비상 해제로 열 수 있다.
    this.addPartition(455, 286, 890, 22, "LOCKED");
    this.addPartition(990, 286, 100, 22, "LOCKED");
    this.addDoorway(920, 286, false);

    // COLUMN N 직접 진입로. 벽과 연결 CCTV가 같은 논리 열에 묶인다.
    this.addPartition(1080, 560, 22, 752, "COLUMN_N");
    this.addDoorway(1080, 338, true);

    this.createDeskPod(220, 170, "office-ref-leaderBack");
    this.createDeskPod(520, 170, "office-ref-coworkerBack");
    this.createDeskPod(260, 650, "office-ref-coworkerBack");
    this.addHideableFurniture(720, 820, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1240, 700);

    // R열 밖 일반 업무 공간은 이번 시트에서 잠겨 있다.
    this.addPartition(1440, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1640, 220, "office-ref-coworkerBack");
    this.createDeskPod(1920, 220, "office-ref-leaderBack");
    this.createMeetingTable(1760, 560);
    this.addHideableFurniture(1940, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession1FinalLayout() {
    this.configureRoute(
      { x: 120, y: 494 },
      { x: 1240, y: 130 },
      { x: 1320, y: 494 },
      { axis: "horizontal", x: 700, y: 598, minimum: 500, maximum: 980 },
    );

    // L2:P6 evaluation block. ROW 5 is the only editable crossing into it.
    this.addPartition(760, 100, 22, 184, "LOCKED");
    this.addPartition(760, 610, 22, 652, "LOCKED");
    this.addDoorway(760, 234, true);
    const reviewGate = this.add.image(760, 234, "office-ref-turnstile")
      .setDisplaySize(82, 82).setDepth(9);
    const reviewGateBody = this.addWall(760, 234, 58, 72, 0);
    this.registerHideTarget([reviewGate], [reviewGateBody], "ROW_5");

    this.addPartition(900, 390, 260, 22, "LOCKED");
    this.addPartition(1240, 390, 300, 22, "LOCKED");
    this.addDoorway(1060, 390, false);

    this.createDeskPod(220, 170, "office-ref-leaderBack");
    this.createDeskPod(520, 650, "office-ref-coworkerBack");
    this.addHideableFurniture(260, 760, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1160, 700);

    // Decorative office continues beyond the prototype play space.
    this.addPartition(1440, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1640, 220, "office-ref-coworkerBack");
    this.createDeskPod(1920, 220, "office-ref-leaderBack");
    this.createMeetingTable(1760, 560);
    this.addHideableFurniture(1940, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession2Sheet1Layout() {
    this.configureRoute(
      { x: 120, y: 390 },
      { x: 1160, y: 390 },
      { x: 1240, y: 390 },
      { axis: "horizontal", x: 620, y: 650, minimum: 440, maximum: 780 },
    );

    // K5 confirmation gate separates the sorted queue from the request office.
    this.addPartition(840, 100, 22, 184, "LOCKED");
    this.addPartition(840, 610, 22, 652, "LOCKED");
    this.addDoorway(840, 234, true);

    this.createDeskPod(220, 170, "office-ref-leaderBack");
    this.createDeskPod(220, 650, "office-ref-coworkerBack");
    this.addHideableFurniture(560, 760, "office-ref-bookshelf", 92, 106, 82, 96);
    this.addHideableFurniture(1040, 700, "office-ref-filingCabinet", 72, 80, 62, 68);

    this.addPartition(1360, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1600, 220, "office-ref-coworkerBack");
    this.createDeskPod(1900, 220, "office-ref-leaderBack");
    this.createMeetingTable(1760, 560);
    this.addHideableFurniture(1940, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession2Sheet2Layout() {
    this.configureRoute(
      { x: 120, y: 442 },
      { x: 1240, y: 442 },
      { x: 1320, y: 442 },
      { axis: "horizontal", x: 520, y: 702, minimum: 360, maximum: 680 },
    );

    this.addPartition(760, 100, 22, 184, "LOCKED");
    this.addPartition(760, 610, 22, 652, "LOCKED");
    this.addDoorway(760, 234, true);

    this.createDeskPod(180, 170, "office-ref-leaderBack");
    this.createDeskPod(220, 700, "office-ref-coworkerBack");
    this.addHideableFurniture(560, 850, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1080, 650);
    this.addHideableFurniture(1280, 760, "office-ref-filingCabinet", 72, 80, 62, 68);

    this.addPartition(1440, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1640, 220, "office-ref-coworkerBack");
    this.createDeskPod(1920, 220, "office-ref-leaderBack");
    this.createMeetingTable(1760, 560);
    this.addHideableFurniture(1940, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession2Sheet3Layout() {
    this.configureRoute(
      { x: 120, y: 442 },
      { x: 1320, y: 442 },
      { x: 1400, y: 442 },
      { axis: "horizontal", x: 520, y: 702, minimum: 360, maximum: 700 },
    );

    // K5 clearance checkpoint. FILTER temporarily opens this staffed gate.
    this.addPartition(840, 100, 22, 184, "LOCKED");
    this.addPartition(840, 610, 22, 652, "LOCKED");
    this.addDoorway(840, 234, true);

    this.createDeskPod(180, 650, "office-ref-coworkerBack");
    this.addHideableFurniture(500, 820, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1110, 650);
    this.addHideableFurniture(1240, 790, "office-ref-filingCabinet", 72, 80, 62, 68);

    // The rest of the floor stays visible as a believable office, but is not playable yet.
    this.addPartition(1520, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1700, 220, "office-ref-coworkerBack");
    this.createMeetingTable(1840, 560);
    this.addHideableFurniture(1980, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession2Sheet4Layout() {
    this.configureRoute(
      { x: 120, y: 442 },
      { x: 1320, y: 442 },
      { x: 1400, y: 442 },
      { axis: "horizontal", x: 520, y: 702, minimum: 360, maximum: 700 },
    );

    // K5 dispatch checkpoint. Opens only after the team leader clears P3.
    this.addPartition(840, 100, 22, 184, "LOCKED");
    this.addPartition(840, 610, 22, 652, "LOCKED");
    this.addDoorway(840, 234, true);

    this.createDeskPod(180, 650, "office-ref-coworkerBack");
    this.addHideableFurniture(500, 820, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1110, 650);
    this.addHideableFurniture(1240, 790, "office-ref-filingCabinet", 72, 80, 62, 68);

    // The rest of the floor stays visible as a believable office, but is not playable yet.
    this.addPartition(1520, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1700, 220, "office-ref-coworkerBack");
    this.createMeetingTable(1840, 560);
    this.addHideableFurniture(1980, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession2FinalLayout() {
    this.configureRoute(
      { x: 120, y: 442 },
      { x: 1320, y: 442 },
      { x: 1400, y: 442 },
      { axis: "horizontal", x: 520, y: 702, minimum: 360, maximum: 700 },
    );

    // K5 audit checkpoint. Opens once the COMPLIANT verdict is stored at Q3.
    this.addPartition(920, 100, 22, 184, "LOCKED");
    this.addPartition(920, 610, 22, 652, "LOCKED");
    this.addDoorway(920, 234, true);

    this.createDeskPod(180, 650, "office-ref-coworkerBack");
    this.addHideableFurniture(520, 840, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1180, 660);
    this.addHideableFurniture(1320, 800, "office-ref-filingCabinet", 72, 80, 62, 68);

    // The far floor stays visible as a believable office, but is not playable yet.
    this.addPartition(1520, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1700, 220, "office-ref-coworkerBack");
    this.createMeetingTable(1840, 560);
    this.addHideableFurniture(1980, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession3Sheet1Layout() {
    this.configureRoute(
      { x: 160, y: 620 },
      { x: 1200, y: 442 },
      { x: 1400, y: 442 },
      { axis: "horizontal", x: 520, y: 780, minimum: 360, maximum: 720 },
    );

    // K5 automatic door in the checkpoint wall. IF opens it when EMPLOYEE_A reaches G4.
    this.addPartition(840, 100, 22, 184, "LOCKED");
    this.addPartition(840, 610, 22, 652, "LOCKED");
    this.addDoorway(840, 234, true);

    this.createDeskPod(200, 760, "office-ref-coworkerBack");
    this.addHideableFurniture(300, 900, "office-ref-plant", 56, 68, 44, 52);
    this.createMeetingTable(1120, 660);

    // The far floor stays a believable office, locked for this tutorial.
    this.addPartition(1520, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1700, 220, "office-ref-coworkerBack");
    this.createMeetingTable(1840, 560);
    this.addHideableFurniture(1980, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession3Sheet2Layout() {
    this.configureRoute(
      { x: 160, y: 620 },
      { x: 1400, y: 442 },
      { x: 1560, y: 442 },
      { axis: "horizontal", x: 420, y: 800, minimum: 300, maximum: 640 },
    );

    // H5 service door (opens on the immediate IF) in the first checkpoint wall.
    this.addPartition(680, 100, 22, 184, "LOCKED");
    this.addPartition(680, 610, 22, 652, "LOCKED");
    this.addDoorway(680, 234, true);

    // N5 server-room door (opens on the delayed IF) in the second checkpoint wall.
    this.addPartition(1120, 100, 22, 184, "LOCKED");
    this.addPartition(1120, 610, 22, 652, "LOCKED");
    this.addDoorway(1120, 234, true);

    this.createDeskPod(200, 760, "office-ref-coworkerBack");
    this.addHideableFurniture(940, 820, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1320, 680);

    // The far floor stays a believable office, locked for this puzzle.
    this.addPartition(1680, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1840, 220, "office-ref-coworkerBack");
    this.addHideableFurniture(1980, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildSession3Sheet3Layout() {
    this.configureRoute(
      { x: 160, y: 442 },
      { x: 1200, y: 442 },
      { x: 1360, y: 442 },
      { axis: "horizontal", x: 500, y: 800, minimum: 340, maximum: 700 },
    );

    // L5 timed door in the checkpoint wall; the conveyor's IF opens it for 3s.
    this.addPartition(920, 100, 22, 184, "LOCKED");
    this.addPartition(920, 610, 22, 652, "LOCKED");
    this.addDoorway(920, 234, true);

    this.createDeskPod(220, 720, "office-ref-coworkerBack");
    this.addHideableFurniture(560, 860, "office-ref-bookshelf", 92, 106, 82, 96);
    this.createMeetingTable(1180, 680);

    // The far floor stays a believable office, locked for this puzzle.
    this.addPartition(1520, WORLD_HEIGHT / 2, 22, WORLD_HEIGHT, "LOCKED");
    this.createDeskPod(1700, 220, "office-ref-coworkerBack");
    this.addHideableFurniture(1980, 820, "office-ref-plant", 56, 68, 44, 52);
  }

  private buildOperationsLayout() {
    const offset = (this.officeSheet.session - 1) * 8;
    this.configureRoute(
      { x: 200, y: 806 }, { x: 1640, y: 806 }, { x: 1880, y: 156 },
      { axis: "vertical", x: 760, y: 520, minimum: 416, maximum: 624 },
    );
    this.addPartition(600, 184, 24, 352);
    this.addPartition(600, 744, 24, 384);
    this.addPartition(1040, 364, 720, 22);
    this.addPartition(1600, 364, 240, 22);
    this.addPartition(1040, 676, 720, 22);
    this.addPartition(1600, 676, 240, 22);
    this.addDoorway(1440, 364, false);
    this.addDoorway(1440, 676, false);
    this.addDoorway(600, 520, true);
    const gate = this.add.image(600, 520, "office-ref-turnstile").setDisplaySize(82, 82).setDepth(8);
    const gateCollider = this.addWall(600, 520, 28, 84, 0);
    this.registerHideTarget([gate], [gateCollider]);
    this.createDeskPod(200, 260 + offset, "office-ref-coworkerBack");
    this.createDeskPod(440, 260 + offset, "office-ref-leaderBack");
    this.createDeskPod(200, 520 + offset, "office-ref-coworkerBack");
    this.createDeskPod(440, 520 + offset, "office-ref-coworkerBack");
    this.createMeetingTable(1680, 510);
  }

  private buildRecordsLayout() {
    const shift = (this.officeSheet.session - 1) * 16;
    this.configureRoute(
      { x: 160, y: 806 }, { x: 1760, y: 754 }, { x: 1920, y: 156 },
      { axis: "horizontal", x: 1110, y: 520, minimum: 890, maximum: 1390 },
    );
    this.addPartition(680, 156, 22, 296);
    this.addPartition(680, 500, 22, 280);
    this.addPartition(680, 832, 22, 184);
    this.addDoorway(680, 338, true);
    this.addDoorway(680, 666, true);
    this.addPartition(1086, 364, 772, 22);
    this.addPartition(1604, 364, 168, 22);
    this.addPartition(1086, 676, 772, 22);
    this.addPartition(1604, 676, 168, 22);
    this.addDoorway(1520, 364, false);
    this.addDoorway(1520, 676, false);
    this.createDeskPod(200, 252 + shift / 4, "office-ref-coworkerBack");
    this.createDeskPod(440, 252 + shift / 4, "office-ref-leaderBack");
    this.createDeskPod(200, 520 + shift / 3, "office-ref-coworkerBack");
    for (const x of [880 + shift, 1120, 1360 - shift]) {
      this.addHideableFurniture(x, 250, "office-ref-bookshelf", 92, 106, 82, 96);
      this.addHideableFurniture(x, 790, "office-ref-filingCabinet", 72, 80, 62, 68);
    }
  }

  private buildCheckpointLayout() {
    const shift = (this.officeSheet.session - 1) * 14;
    this.configureRoute(
      { x: 160, y: 780 }, { x: 1740, y: 780 }, { x: 1920, y: 156 },
      { axis: "vertical", x: 1220, y: 510, minimum: 250, maximum: 660 },
    );
    this.addPartition(560, 156, 22, 296);
    this.addPartition(560, 520, 22, 260);
    this.addPartition(560, 832, 22, 184);
    this.addPartition(1040, 156, 22, 296);
    this.addPartition(1040, 520, 22, 260);
    this.addPartition(1040, 832, 22, 184);
    this.addPartition(1500, 156, 22, 296);
    this.addPartition(1500, 520, 22, 260);
    this.addPartition(1500, 832, 22, 184);
    for (const x of [560, 1040, 1500]) {
      this.addDoorway(x, 338, true);
      this.addDoorway(x, 676, true);
    }
    this.createReceptionDesk(300, 400 + shift);
    for (const x of [800, 1280]) {
      const gate = this.add.image(x, 520, "office-ref-turnstile").setDisplaySize(80, 80).setDepth(5);
      const collider = this.addWall(x, 520, 32, 82, 0);
      this.registerHideTarget([gate], [collider]);
    }
    this.createDeskPod(1780, 430 + shift / 2, "office-ref-leaderBack");
  }

  private buildMeetingLayout() {
    const shift = (this.officeSheet.session - 1) * 12;
    this.configureRoute(
      { x: 180, y: 806 }, { x: 1840, y: 780 }, { x: 1920, y: 156 },
      { axis: "horizontal", x: 1160, y: 740, minimum: 860, maximum: 1500 },
    );
    this.addPartition(760, 182, 22, 348);
    this.addPartition(760, 578, 22, 250);
    this.addPartition(760, 856, 22, 144);
    this.addDoorway(760, 382, true);
    this.addDoorway(760, 718, true);
    for (const y of [364, 676]) {
      this.addPartition(875, y, 230, 22);
      this.addPartition(1360, y, 540, 22);
      this.addPartition(1885, y, 310, 22);
    }
    this.addDoorway(1040, 364, false);
    this.addDoorway(1680, 364, false);
    this.addDoorway(1040, 676, false);
    this.addDoorway(1680, 676, false);
    this.createDeskPod(220, 252 + shift / 3, "office-ref-coworkerBack");
    this.createDeskPod(500, 252 + shift / 3, "office-ref-leaderBack");
    this.createDeskPod(220, 540 + shift / 3, "office-ref-coworkerBack");
    this.createMeetingTable(1260 - shift, 500 + shift / 2);
    this.createMeetingTable(1740 + shift / 3, 540 - shift / 3);
  }

  private buildAuditLayout() {
    const shift = (this.officeSheet.session - 1) * 12;
    this.configureRoute(
      { x: 160, y: 806 }, { x: 1120, y: 240 }, { x: 1920, y: 156 },
      { axis: "horizontal", x: 1100, y: 728, minimum: 760, maximum: 1440 },
    );
    this.addPartition(500, 364, 840, 22);
    this.addPartition(1560, 364, 960, 22);
    this.addPartition(500, 676, 840, 22);
    this.addPartition(1560, 676, 960, 22);
    this.addDoorway(1040, 364, false);
    this.addDoorway(1040, 676, false);
    this.addPartition(680, 156, 22, 296);
    this.addPartition(680, 520, 22, 260);
    this.addPartition(680, 832, 22, 184);
    this.addPartition(1600, 156, 22, 296);
    this.addPartition(1600, 520, 22, 260);
    this.addPartition(1600, 832, 22, 184);
    this.addDoorway(680, 338, true);
    this.addDoorway(680, 676, true);
    this.addDoorway(1600, 338, true);
    this.addDoorway(1600, 676, true);
    this.createDeskPod(260, 250 + shift / 3, "office-ref-leaderBack");
    this.createDeskPod(260, 520 + shift / 3, "office-ref-coworkerBack");
    this.createMeetingTable(1120 - shift / 2, 520);
    this.createDeskPod(1840, 500 + shift / 3, "office-ref-coworkerBack");
    this.createManager(1380 + shift / 2, 520);
  }

  private configureRoute(
    player: { x: number; y: number },
    terminal: { x: number; y: number },
    exit: { x: number; y: number },
    guard: { axis: "horizontal" | "vertical"; x: number; y: number; minimum: number; maximum: number },
  ) {
    this.playerStart = player;
    this.terminalPosition = terminal;
    this.exitPosition = exit;
    this.guardAxis = guard.axis;
    this.guardStart = { x: guard.x, y: guard.y };
    this.guardMinimum = guard.minimum;
    this.guardMaximum = guard.maximum;
  }

  private addDoorway(x: number, y: number, vertical: boolean) {
    const doorway = this.add.image(x, y, "office-ref-doorway")
      .setDisplaySize(vertical ? 24 : 84, vertical ? 78 : 24)
      .setDepth(8);
    if (vertical) doorway.setAngle(90);
    this.registerHideTarget([doorway]);
  }

  private createMeetingTable(x: number, y: number) {
    const shadow = this.add.ellipse(x, y + 30, 274, 72, 0x16312c, 0.17);
    const table = this.add.image(x, y, "office-ref-conferenceTable")
      .setDisplaySize(260, 130).setDepth(3);
    const collider = this.addWall(x, y, 250, 112, 0);
    this.registerHideTarget([shadow, table], [collider]);
  }

  private createReceptionDesk(x: number, y: number) {
    this.createDeskPod(x, y, "office-ref-leaderBack");
    this.addHideableFurniture(x + 230, y + 40, "office-ref-scanner", 70, 78, 58, 66);
  }

  private placeSessionProps() {
    const props: Record<number, readonly [string, number, number][]> = {
      1: [["office-ref-copier", 1980, 820], ["office-ref-filingCabinet", 1980, 710]],
      2: [["office-ref-scanner", 1980, 820], ["office-ref-sensorPad", 1980, 710]],
      3: [["office-ref-projector", 1980, 820], ["office-ref-chargeNode", 1980, 710]],
      4: [["office-ref-saveSlot", 1980, 820], ["office-ref-filingCabinet", 1980, 710]],
      5: [["office-ref-serverRack", 1980, 820], ["office-ref-cctv", 1980, 710]],
      6: [["office-ref-rootLock", 1980, 820], ["office-ref-serverRack", 1980, 710]],
    };
    for (const [texture, x, y] of props[this.officeSheet.session] ?? []) {
      this.addHideableFurniture(x, y, texture, 72, 78, 60, 66);
    }
    this.addHideableFurniture(90, 650, "office-ref-plant", 56, 68, 44, 52);
    this.addHideableFurniture(90, 110, "office-ref-waterCooler", 54, 72, 44, 58);
  }

  private createManager(x: number, y: number) {
    const textureBySession = [
      "office-ref-managerVlookup",
      "office-ref-chiefCountif",
      "office-ref-directorIferror",
      "office-ref-auditorCtrl",
      "office-ref-vpDrop",
      "office-ref-managerVlookup",
    ];
    const manager = this.add.image(
      x,
      y,
      textureBySession[this.officeSheet.session - 1] ?? "office-ref-managerVlookup",
    )
      .setDisplaySize(62, 88).setDepth(9);
    const collider = this.addWall(x, y + 8, 48, 58, 0);
    this.registerHideTarget([manager], [collider]);
  }

  private createDeskPod(x: number, y: number, employeeTexture: string) {
    const shadow = this.add.ellipse(x, y + 54, 166, 44, 0x17312c, 0.14);
    const desk = this.add.image(x, y - 30, "office-ref-desk")
      .setDisplaySize(150, 76).setDepth(2);
    const monitor = this.add.image(x, y - 53, "office-ref-monitor")
      .setDisplaySize(42, 38).setDepth(3);
    const employee = this.add.image(x, y + 30, employeeTexture)
      .setDisplaySize(60, 82).setDepth(4);
    const chair = this.add.image(x, y + 66, "office-ref-chair")
      .setDisplaySize(58, 58).setDepth(5);
    const deskCollider = this.addWall(x, y - 12, 152, 74, 0);
    const chairCollider = this.addWall(x, y + 68, 54, 50, 0);
    this.registerHideTarget(
      [shadow, desk, monitor, employee, chair],
      [deskCollider, chairCollider],
    );
  }

  private createPlayer() {
    this.playerShadow = this.add.ellipse(this.playerStart.x, this.playerStart.y + 33, 46, 15, 0x102720, 0.24)
      .setDepth(19);
    this.player = this.physics.add.sprite(this.playerStart.x, this.playerStart.y, "office-ref-playerWalkFront1")
      .setScale(0.2)
      .setCollideWorldBounds(true)
      .setDepth(20);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(92, 108).setOffset(43, 205);
    if (this.walls) this.physics.add.collider(this.player, this.walls);
  }

  private createGuard() {
    if (this.isSession1Sheet3()) return;
    this.guardShadow = this.add.ellipse(this.guardStart.x, this.guardStart.y + 33, 48, 15, 0x102720, 0.24)
      .setDepth(17);
    this.guard = this.physics.add.sprite(this.guardStart.x, this.guardStart.y, "office-ref-guardWalkFront1")
      .setScale(0.2)
      .setDepth(18);
    const body = this.guard.body as Phaser.Physics.Arcade.Body;
    body.setSize(180, 190).setOffset(166, 282);
    body.setVelocity(0);
    this.registerHideTarget(
      [this.guard, this.guardShadow],
      [this.guard],
      this.isSession1Sheet2() ? "ROW_6" : undefined,
    );
    if (this.isSession1Sheet2()) {
      this.secondGuardShadow = this.add.ellipse(
        this.secondGuardStart.x,
        this.secondGuardStart.y + 33,
        48,
        15,
        0x102720,
        0.24,
      ).setDepth(17);
      this.secondGuard = this.physics.add.sprite(
        this.secondGuardStart.x,
        this.secondGuardStart.y,
        "office-ref-guardWalkLeft1",
      ).setScale(0.2).setDepth(18);
      const secondBody = this.secondGuard.body as Phaser.Physics.Arcade.Body;
      secondBody.setSize(180, 190).setOffset(166, 282).setVelocity(0);
      this.registerHideTarget(
        [this.secondGuard, this.secondGuardShadow],
        [this.secondGuard],
      );
    }
  }

  private createMissionObjects() {
    if (this.isSession1Sheet2()) {
      this.createSession1Sheet2MissionObjects();
      return;
    }
    if (this.isSession1Sheet3()) {
      this.createSession1Sheet3MissionObjects();
      return;
    }
    if (this.isSession1Sheet4()) {
      this.createSession1Sheet4MissionObjects();
      return;
    }
    if (this.isSession1Final()) {
      this.createSession1FinalMissionObjects();
      return;
    }
    if (this.isSession2Sheet1()) {
      this.createSession2Sheet1MissionObjects();
      return;
    }
    if (this.isSession2Sheet2()) {
      this.createSession2Sheet2MissionObjects();
      return;
    }
    if (this.isSession2Sheet3()) {
      this.createSession2Sheet3MissionObjects();
      return;
    }
    if (this.isSession2Sheet4()) {
      this.createSession2Sheet4MissionObjects();
      return;
    }
    if (this.isSession2Final()) {
      this.createSession2FinalMissionObjects();
      return;
    }
    if (this.isSession3Sheet1()) {
      this.createSession3Sheet1MissionObjects();
      return;
    }
    if (this.isSession3Sheet2()) {
      this.createSession3Sheet2MissionObjects();
      return;
    }
    if (this.isSession3Sheet3()) {
      this.createSession3Sheet3MissionObjects();
      return;
    }
    this.terminalHighlight = this.add.image(this.terminalPosition.x, this.terminalPosition.y, "office-ref-itemHighlight")
      .setDisplaySize(94, 94)
      .setTint(0xffd66e)
      .setAlpha(0.44)
      .setDepth(7);
    this.tweens.add({
      targets: this.terminalHighlight,
      alpha: 0.2,
      scaleX: this.terminalHighlight.scaleX * 1.06,
      scaleY: this.terminalHighlight.scaleY * 1.06,
      duration: 760,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });
    this.terminal = this.add.image(this.terminalPosition.x, this.terminalPosition.y, "office-ref-terminal")
      .setDisplaySize(74, 92).setDepth(8);
    const terminalCollider = this.addWall(
      this.terminalPosition.x,
      this.terminalPosition.y,
      66,
      82,
      0,
    );
    this.registerHideTarget(
      [this.terminalHighlight, this.terminal],
      [terminalCollider],
    );

    this.exitDoor = this.add.image(this.exitPosition.x, this.exitPosition.y, "office-ref-exitLocked")
      .setDisplaySize(86, 112).setDepth(8);
    const exitCollider = this.addWall(this.exitPosition.x, this.exitPosition.y, 76, 100, 0);
    this.registerHideTarget([this.exitDoor], [exitCollider]);

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession1Sheet2MissionObjects() {
    const contractPosition = { x: 840, y: 130 };
    this.contractHighlight = this.add.image(
      contractPosition.x,
      contractPosition.y,
      "office-ref-itemHighlight",
    ).setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.42).setDepth(7);
    this.contractDocument = this.add.image(
      contractPosition.x,
      contractPosition.y,
      "office-ref-contractDocument",
    ).setDisplaySize(50, 58).setDepth(8);

    this.rechargeHighlight = this.add.image(360, 78, "office-ref-itemHighlight")
      .setDisplaySize(76, 76).setTint(0x71d8cb).setAlpha(0.32).setDepth(7);
    this.rechargeNode = this.add.image(360, 78, "office-ref-chargeNode")
      .setDisplaySize(58, 58).setDepth(8);
    const rechargeBody = this.addWall(360, 78, 48, 48, 0);
    this.registerHideTarget(
      [this.rechargeHighlight, this.rechargeNode],
      [rechargeBody],
    );

    this.terminalHighlight = this.add.image(
      this.terminalPosition.x,
      this.terminalPosition.y,
      "office-ref-itemHighlight",
    ).setDisplaySize(86, 86).setTint(0xffd66e).setAlpha(0.36).setDepth(7);
    this.terminal = this.add.image(
      this.terminalPosition.x,
      this.terminalPosition.y,
      "office-ref-saveSlot",
    ).setDisplaySize(64, 72).setDepth(8);
    const outboxBody = this.addWall(
      this.terminalPosition.x,
      this.terminalPosition.y,
      52,
      62,
      0,
    );
    this.registerHideTarget([this.terminalHighlight, this.terminal], [outboxBody]);

    this.exitDoor = this.add.image(
      this.exitPosition.x,
      this.exitPosition.y,
      "office-ref-exitLocked",
    ).setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(this.exitPosition.x, this.exitPosition.y, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody]);
    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession1Sheet3MissionObjects() {
    this.sheet3TrainingHighlight = this.add.image(440, 390, "office-ref-itemHighlight")
      .setDisplaySize(84, 84).setTint(0x71d8cb).setAlpha(0.36).setDepth(7);
    this.sheet3TrainingTerminal = this.add.image(440, 390, "office-ref-terminal")
      .setDisplaySize(62, 76).setDepth(8);
    const trainingBody = this.addWall(440, 390, 52, 64, 0);
    this.registerHideTarget(
      [this.sheet3TrainingHighlight, this.sheet3TrainingTerminal],
      [trainingBody],
      "LOCKED",
    );

    this.sheet3PasteStation = this.add.image(560, 390, "office-ref-sensorPad")
      .setDisplaySize(66, 54).setDepth(8);
    const pasteBody = this.addWall(560, 390, 56, 42, 0);
    this.registerHideTarget([this.sheet3PasteStation], [pasteBody], "LOCKED");

    this.sheet3BadgeHighlight = this.add.image(600, 130, "office-ref-itemHighlight")
      .setDisplaySize(76, 76).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.sheet3LeaderBadge = this.add.image(600, 130, "office-ref-keycard")
      .setDisplaySize(48, 42).setDepth(8);

    this.sheet3SecurityDoor = this.add.image(840, 286, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.sheet3SecurityDoorBody = this.addWall(840, 286, 58, 88, 0);

    this.sheet3ApprovalHighlight = this.add.image(1080, 130, "office-ref-itemHighlight")
      .setDisplaySize(78, 78).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.sheet3ApprovalDocument = this.add.image(1080, 130, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.terminalPosition = { x: 1080, y: 78 };
    this.terminalHighlight = this.add.image(1080, 78, "office-ref-itemHighlight")
      .setDisplaySize(72, 72).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.terminal = this.add.image(1080, 78, "office-ref-saveSlot")
      .setDisplaySize(54, 62).setDepth(8);
    const outboxBody = this.addWall(1080, 78, 46, 50, 0);
    this.registerHideTarget([this.terminalHighlight, this.terminal], [outboxBody], "LOCKED");

    this.sheet3BadgeTray = this.add.image(1000, 350, "office-ref-sensorPad")
      .setDisplaySize(66, 54).setTint(0x7fc7a5).setDepth(8);
    const trayBody = this.addWall(1000, 350, 56, 42, 0);
    this.registerHideTarget([this.sheet3BadgeTray], [trayBody], "LOCKED");

    this.add.image(1240, 442, "office-ref-scanner")
      .setDisplaySize(64, 76).setDepth(8);
    this.exitPosition = { x: 1320, y: 442 };
    this.exitDoor = this.add.image(1320, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1320, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession1Sheet4MissionObjects() {
    const pulse = (image: Phaser.GameObjects.Image) => {
      this.tweens.add({
        targets: image,
        alpha: 0.2,
        scaleX: image.scaleX * 1.06,
        scaleY: image.scaleY * 1.06,
        duration: 760,
        ease: "Sine.InOut",
        yoyo: true,
        repeat: -1,
      });
    };

    const printerHighlight = this.add.image(520, 390, "office-ref-itemHighlight")
      .setDisplaySize(86, 86).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    pulse(printerHighlight);
    this.sheet4Printer = this.add.image(520, 390, "office-ref-copier")
      .setDisplaySize(70, 88).setDepth(8);
    const printerBody = this.addWall(520, 390, 58, 76, 0);
    this.registerHideTarget([printerHighlight, this.sheet4Printer], [printerBody], "LOCKED");

    const cabinetHighlight = this.add.image(360, 338, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.38).setDepth(7);
    pulse(cabinetHighlight);
    this.sheet4Cabinet = this.add.image(360, 338, "office-ref-filingCabinet")
      .setDisplaySize(66, 74).setDepth(8);
    const cabinetBody = this.addWall(360, 338, 54, 62, 0);
    this.registerHideTarget([cabinetHighlight, this.sheet4Cabinet], [cabinetBody], "LOCKED");

    this.sheet4PrinterTarget = this.add.image(1000, 390, "office-ref-sensorPad")
      .setDisplaySize(66, 54).setTint(0x7fc7a5).setDepth(8);
    const printerTargetBody = this.addWall(1000, 390, 54, 42, 0);
    this.registerHideTarget([this.sheet4PrinterTarget], [printerTargetBody], "LOCKED");

    this.sheet4CabinetTarget = this.add.image(840, 182, "office-ref-sensorPad")
      .setDisplaySize(66, 54).setTint(0x8fb4c7).setDepth(8);
    const cabinetTargetBody = this.addWall(840, 182, 54, 42, 0);
    this.registerHideTarget([this.sheet4CabinetTarget], [cabinetTargetBody], "LOCKED");

    this.sheet4AdminDoor = this.add.image(920, 286, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.sheet4AdminDoorBody = this.addWall(920, 286, 58, 88, 0);

    this.sheet4EmergencyRelease = this.add.image(920, 354, "office-ref-emergencyRelease")
      .setDisplaySize(52, 58).setDepth(8);
    const releaseBody = this.addWall(920, 354, 42, 48, 0);
    this.registerHideTarget([this.sheet4EmergencyRelease], [releaseBody], "LOCKED");

    this.sheet4Facilities = [
      this.add.image(360, 650, "office-ref-coworkerFront").setDisplaySize(56, 78).setDepth(10),
      this.add.image(520, 650, "office-ref-coworkerFront").setDisplaySize(56, 78).setDepth(10),
    ];

    this.sheet4Cctvs = [
      this.add.image(1040, 182, "office-ref-cctv").setDisplaySize(62, 62).setDepth(9),
      this.add.image(1160, 390, "office-ref-cctv").setDisplaySize(62, 62).setDepth(9),
    ];
    for (const cctv of this.sheet4Cctvs) {
      this.registerHideTarget([cctv], [], "COLUMN_N");
    }

    this.sheet4ColleagueHighlight = this.add.image(1160, 130, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    pulse(this.sheet4ColleagueHighlight);
    this.sheet4Colleague = this.add.image(1160, 130, "office-ref-coworkerFront")
      .setDisplaySize(58, 82).setDepth(10);
    this.terminal = this.sheet4Colleague;
    this.terminalHighlight = this.sheet4ColleagueHighlight;

    this.exitDoor = this.add.image(1320, 494, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1320, 494, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession1FinalMissionObjects() {
    this.finalProjectHighlight = this.add.image(440, 130, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.finalProjectBonus = this.add.image(440, 130, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.finalRechargeNode = this.add.image(360, 390, "office-ref-chargeNode")
      .setDisplaySize(58, 58).setDepth(8);
    const rechargeBody = this.addWall(360, 390, 48, 48, 0);
    this.registerHideTarget([this.finalRechargeNode], [rechargeBody], "LOCKED");

    const evaluationRows = [
      { y: 78, label: "ATTENDANCE", value: "+20", tint: 0xdcebdc },
      { y: 130, label: "TASK COMPLETION", value: "+22", tint: 0xdcebdc },
      { y: 182, label: "POTENTIAL", value: "+15", tint: 0xdcebdc },
      { y: 234, label: "PROBATION PENALTY", value: "-15", tint: 0xf0c5bd },
      { y: 286, label: "BORROWED RESULT", value: "0", tint: 0xd8e4e0 },
    ];
    for (const row of evaluationRows) {
      const background = this.add.rectangle(1060, row.y, 300, 40, row.tint, 0.9)
        .setStrokeStyle(1, 0x78968c).setDepth(6);
      const label = this.add.text(920, row.y, row.label, {
        color: "#23463d",
        fontFamily: "monospace",
        fontSize: "16px",
      }).setOrigin(0, 0.5).setDepth(7);
      const value = this.add.text(1184, row.y, row.value, {
        color: row.value.startsWith("-") ? "#9a3f39" : "#285b45",
        fontFamily: "monospace",
        fontSize: "18px",
        fontStyle: "bold",
      }).setOrigin(1, 0.5).setDepth(7);
      if (row.y === 234) {
        this.registerHideTarget([background, label, value], [], "ROW_5");
      }
    }

    this.finalBorrowTarget = this.add.image(1160, 286, "office-ref-sensorPad")
      .setDisplaySize(62, 48).setTint(0x7fc7a5).setDepth(9);

    this.finalSubmitTerminal = this.add.image(1240, 130, "office-ref-terminal")
      .setDisplaySize(64, 80).setDepth(10);
    this.terminal = this.finalSubmitTerminal;
    this.terminalHighlight = this.add.image(1240, 130, "office-ref-itemHighlight")
      .setDisplaySize(86, 86).setTint(0xffd66e).setAlpha(0.34).setDepth(8);

    this.finalManager = this.add.image(840, 130, "office-ref-managerVlookup")
      .setDisplaySize(62, 88).setDepth(10);
    const managerBody = this.addWall(840, 138, 48, 58, 0);
    this.registerHideTarget([this.finalManager], [managerBody], "LOCKED");

    this.finalCctvs = [
      this.add.image(960, 442, "office-ref-cctv").setDisplaySize(62, 62).setDepth(9),
      this.add.image(1260, 650, "office-ref-cctv").setDisplaySize(62, 62).setDepth(9),
    ];
    for (const cctv of this.finalCctvs) this.registerHideTarget([cctv], [], "LOCKED");

    this.exitDoor = this.add.image(1320, 494, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1320, 494, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.finalScoreLabel = this.add.text(880, 334, "", {
      backgroundColor: "#f4f7ee",
      color: "#17382f",
      fontFamily: "monospace",
      fontSize: "20px",
      padding: { x: 12, y: 8 },
    }).setDepth(30);
    this.finalManagerLabel = this.add.text(600, 334, "", {
      backgroundColor: "#273f39",
      color: "#f2d875",
      fontFamily: "monospace",
      fontSize: "17px",
      padding: { x: 12, y: 7 },
    }).setOrigin(0.5, 0).setDepth(30);
    this.updateFinalScoreDisplay();

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession2Sheet1MissionObjects() {
    this.s2s1TrainingHighlight = this.add.image(280, 338, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0x71d8cb).setAlpha(0.38).setDepth(7);
    this.s2s1TrainingTerminal = this.add.image(280, 338, "office-ref-terminal")
      .setDisplaySize(62, 76).setDepth(8);
    const trainingBody = this.addWall(280, 338, 52, 64, 0);
    this.registerHideTarget(
      [this.s2s1TrainingHighlight, this.s2s1TrainingTerminal],
      [trainingBody],
      "LOCKED",
    );

    this.s2s1SortStation = this.add.image(440, 338, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const sortStationBody = this.addWall(440, 338, 56, 42, 0);
    this.registerHideTarget([this.s2s1SortStation], [sortStationBody], "LOCKED");

    const queueData = [
      { name: "TEAM_LEADER", rank: 3 },
      { name: "STAFF_B", rank: 2 },
      { name: "INTERN", rank: 1 },
      { name: "STAFF_A", rank: 2 },
      { name: "UNKNOWN", rank: null },
    ];
    this.s2s1QueueEntries = queueData.map((entry, originalIndex) => {
      const background = this.add.rectangle(0, 0, 74, 76, 0xf3f6ef, 0.96)
        .setStrokeStyle(2, 0x78968c);
      const name = this.add.text(0, -14, entry.name, {
        color: "#24463d",
        fontFamily: "monospace",
        fontSize: entry.name.length > 9 ? "10px" : "12px",
        fontStyle: "bold",
      }).setOrigin(0.5);
      const rank = this.add.text(0, 15, `RANK ${entry.rank ?? ""}`, {
        color: entry.rank === null ? "#9b6b62" : "#527267",
        fontFamily: "monospace",
        fontSize: "11px",
      }).setOrigin(0.5);
      const container = this.add.container(440 + originalIndex * 80, 130, [background, name, rank])
        .setDepth(8);
      return { ...entry, container, originalIndex };
    });

    this.s2s1Gate = this.add.image(840, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s2s1GateBody = this.addWall(840, 234, 58, 88, 0);

    this.s2s1RequestHighlight = this.add.image(1080, 130, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s2s1Request = this.add.image(1080, 130, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s2s1Outbox = this.add.image(1160, 390, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1160, 390, 52, 62, 0);
    this.terminal = this.s2s1Outbox;
    this.terminalHighlight = this.add.image(1160, 390, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s2s1Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1240, 390, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1240, 390, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession2Sheet2MissionObjects() {
    this.s2s2SortStation = this.add.image(360, 338, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const sortStationBody = this.addWall(360, 338, 56, 42, 0);
    this.registerHideTarget([this.s2s2SortStation], [sortStationBody], "LOCKED");

    const queueData = [
      { name: "SECURITY_A", departmentCode: 3 },
      { name: "OPERATIONS", departmentCode: 2 },
      { name: "HR_A", departmentCode: 1 },
      { name: "SECURITY_B", departmentCode: 3 },
      { name: "HR_B", departmentCode: 1 },
      { name: "UNKNOWN", departmentCode: null },
    ];
    this.s2s2QueueEntries = queueData.map((entry, originalIndex) => {
      const background = this.add.rectangle(0, 0, 74, 46, 0xf3f6ef, 0.96)
        .setStrokeStyle(2, 0x78968c);
      const name = this.add.text(0, -8, entry.name, {
        color: entry.name.startsWith("SECURITY") ? "#7a413a" : "#24463d",
        fontFamily: "monospace",
        fontSize: entry.name.length > 9 ? "9px" : "11px",
        fontStyle: "bold",
      }).setOrigin(0.5);
      const code = this.add.text(0, 10, `DEPT ${entry.departmentCode ?? ""}`, {
        color: entry.departmentCode === null ? "#9b6b62" : "#527267",
        fontFamily: "monospace",
        fontSize: "9px",
      }).setOrigin(0.5);
      const column = originalIndex % 3;
      const row = Math.floor(originalIndex / 3);
      const container = this.add.container(440 + column * 80, 130 + row * 52, [background, name, code])
        .setDepth(8);
      return { ...entry, container, originalIndex };
    });

    this.s2s2Gate = this.add.image(760, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s2s2GateBody = this.addWall(760, 234, 58, 88, 0);

    this.s2s2Cctv = this.add.image(720, 390, "office-ref-cctv")
      .setDisplaySize(62, 62).setDepth(9);
    this.registerHideTarget([this.s2s2Cctv], [], "LOCKED");

    this.s2s2RequestHighlight = this.add.image(1080, 130, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s2s2Request = this.add.image(1080, 130, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s2s2Outbox = this.add.image(1240, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1240, 442, 52, 62, 0);
    this.terminal = this.s2s2Outbox;
    this.terminalHighlight = this.add.image(1240, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s2s2Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1320, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1320, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession2Sheet3MissionObjects() {
    this.s2s3TrainingTerminal = this.add.image(280, 390, "office-ref-terminal")
      .setDisplaySize(64, 80).setTint(0x91cbb4).setDepth(8);
    const trainingBody = this.addWall(280, 390, 54, 70, 0);
    this.registerHideTarget([this.s2s3TrainingTerminal], [trainingBody], "LOCKED");

    this.s2s3FilterStation = this.add.image(600, 338, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x71d8cb).setDepth(8);
    const filterStationBody = this.addWall(600, 338, 56, 42, 0);
    this.registerHideTarget([this.s2s3FilterStation], [filterStationBody], "LOCKED");

    const queueData = [
      { name: "HR_A", clearance: 2 },
      { name: "SECURITY_A", clearance: 3 },
      { name: "STAFF_A", clearance: 1 },
      { name: "STAFF_B", clearance: 2 },
      { name: "EXPIRED_BADGE", clearance: null },
      { name: "VISITOR_BOX", clearance: 0 },
    ];
    this.s2s3QueueEntries = queueData.map((entry, index) => ({
      ...entry,
      container: this.createClearanceCard(
        440 + (index % 3) * 112,
        130 + Math.floor(index / 3) * 58,
        entry.name,
        entry.clearance,
      ),
      qualified: (entry.clearance ?? -1) >= 2,
    }));
    this.s2s3LateStaff = this.createClearanceCard(664, 188, "LATE_STAFF", 1)
      .setVisible(false);

    this.s2s3Gate = this.add.image(840, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s2s3GateBody = this.addWall(840, 234, 58, 88, 0);

    this.s2s3RechargeNode = this.add.image(280, 78, "office-ref-chargeNode")
      .setDisplaySize(58, 58).setDepth(8);
    const rechargeBody = this.addWall(280, 78, 48, 48, 0);
    this.registerHideTarget([this.s2s3RechargeNode], [rechargeBody], "LOCKED");

    this.s2s3Cctv = this.add.image(1030, 546, "office-ref-cctv")
      .setDisplaySize(62, 62).setDepth(9);

    this.s2s3PatchHighlight = this.add.image(1160, 130, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s2s3Patch = this.add.image(1160, 130, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s2s3Outbox = this.add.image(1320, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1320, 442, 52, 62, 0);
    this.terminal = this.s2s3Outbox;
    this.terminalHighlight = this.add.image(1320, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s2s3Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1400, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1400, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession2Sheet4MissionObjects() {
    this.s2s4DispatchHighlight = this.add.image(280, 390, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0x71d8cb).setAlpha(0.38).setDepth(7);
    this.s2s4DispatchTerminal = this.add.image(280, 390, "office-ref-terminal")
      .setDisplaySize(64, 80).setDepth(8);
    const dispatchBody = this.addWall(280, 390, 54, 70, 0);
    this.terminal = this.s2s4DispatchTerminal;
    this.registerHideTarget(
      [this.s2s4DispatchHighlight, this.s2s4DispatchTerminal],
      [dispatchBody],
      "LOCKED",
    );

    this.s2s4WriteConsole = this.add.image(600, 338, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const writeConsoleBody = this.addWall(600, 338, 56, 42, 0);
    this.registerHideTarget([this.s2s4WriteConsole], [writeConsoleBody], "LOCKED");

    const queueData: Array<{ name: string; role: "TEAM_LEADER" | "FACILITIES"; priority: number }> = [
      { name: "BUDGET_APPROVAL", role: "TEAM_LEADER", priority: 60 },
      { name: "VACATION_APPROVAL", role: "TEAM_LEADER", priority: 50 },
      { name: "DEPARTMENT_FIX", role: "TEAM_LEADER", priority: 10 },
      { name: "PRINTER_REPAIR", role: "FACILITIES", priority: 5 },
    ];
    this.s2s4QueueEntries = queueData.map((entry, originalIndex) => ({
      ...entry,
      originalIndex,
      container: this.createTaskCard(
        420 + originalIndex * 112,
        150,
        entry.name,
        entry.role,
        entry.priority,
      ),
    }));

    this.s2s4ProcessHighlight = this.add.image(600, 214, "office-ref-itemHighlight")
      .setDisplaySize(78, 78).setTint(0xffd66e).setAlpha(0.32).setDepth(7);
    this.s2s4ProcessMarker = this.add.image(600, 214, "office-ref-approvalDocument")
      .setDisplaySize(46, 54).setDepth(8);

    this.s2s4Leader = this.add.image(this.s2s4LeaderHome.x, this.s2s4LeaderHome.y, "office-ref-guardFront")
      .setDisplaySize(58, 82).setDepth(18);

    this.s2s4Gate = this.add.image(840, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s2s4GateBody = this.addWall(840, 234, 58, 88, 0);

    this.s2s4Cctv = this.add.image(1030, 546, "office-ref-cctv")
      .setDisplaySize(62, 62).setDepth(9);

    this.s2s4ViolationLabel = this.add.text(600, 640, "POLICY_VIOLATIONS 7 · 목표 2", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "16px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    this.exitDoor = this.add.image(1400, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1400, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession2FinalMissionObjects() {
    this.s2fRechargeNode = this.add.image(280, 78, "office-ref-chargeNode")
      .setDisplaySize(58, 58).setDepth(8);
    const rechargeBody = this.addWall(280, 78, 48, 48, 0);
    this.registerHideTarget([this.s2fRechargeNode], [rechargeBody], "LOCKED");

    this.s2fAuditStation = this.add.image(300, 338, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const auditStationBody = this.addWall(300, 338, 56, 42, 0);
    this.terminal = this.s2fAuditStation;
    this.registerHideTarget([this.s2fAuditStation], [auditStationBody], "LOCKED");

    const rowData: Array<{
      id: number;
      date: "TODAY" | "YESTERDAY";
      status: "COMPLIANT" | "VIOLATION";
      owner: string;
    }> = [
      { id: 1, date: "TODAY", status: "COMPLIANT", owner: "HR_A" },
      { id: 2, date: "TODAY", status: "COMPLIANT", owner: "STAFF_A" },
      { id: 3, date: "TODAY", status: "VIOLATION", owner: "PLAYER" },
      { id: 4, date: "TODAY", status: "COMPLIANT", owner: "OPS_A" },
      { id: 5, date: "YESTERDAY", status: "VIOLATION", owner: "OLD_GUEST" },
      { id: 6, date: "TODAY", status: "COMPLIANT", owner: "STAFF_B" },
      { id: 7, date: "TODAY", status: "COMPLIANT", owner: "OPS_B" },
    ];
    this.s2fRows = rowData.map((row, index) => ({
      ...row,
      visible: true,
      container: this.createAuditRow(500, 110 + index * 52, row),
    }));

    this.s2fGate = this.add.image(920, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s2fGateBody = this.addWall(920, 234, 58, 88, 0);

    this.s2fChief = this.add.image(1120, 520, "office-ref-chiefCountif")
      .setDisplaySize(62, 88).setDepth(18);
    this.s2fChiefLabel = this.add.text(1120, 452, "CHIEF · IDLE", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "14px",
      padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(19);

    this.s2fCctv = this.add.image(1040, 620, "office-ref-cctv")
      .setDisplaySize(62, 62).setDepth(9);

    this.s2fSubmitHighlight = this.add.image(720, 234, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.s2fSubmitTerminal = this.add.image(720, 234, "office-ref-saveSlot")
      .setDisplaySize(64, 74).setDepth(8);
    const submitBody = this.addWall(720, 234, 54, 64, 0);
    this.registerHideTarget([this.s2fSubmitHighlight, this.s2fSubmitTerminal], [submitBody], "LOCKED");

    this.s2fVerdictLabel = this.add.text(500, 500, "ACCESS_VERDICT = QUARANTINE · SAMPLE VIOLATION 2", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    this.exitDoor = this.add.image(1400, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1400, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createAuditRow(
    x: number,
    y: number,
    row: { id: number; date: "TODAY" | "YESTERDAY"; status: "COMPLIANT" | "VIOLATION"; owner: string },
  ) {
    const violation = row.status === "VIOLATION";
    const background = this.add.rectangle(0, 0, 208, 46, 0xf3f6ef, 0.96)
      .setStrokeStyle(2, violation ? 0xb06a5e : 0x6f9d86);
    const idLabel = this.add.text(-92, 0, `R${row.id}`, {
      color: "#24463d",
      fontFamily: "monospace",
      fontSize: "12px",
      fontStyle: "bold",
    }).setOrigin(0, 0.5);
    const dateLabel = this.add.text(-58, 0, row.date, {
      color: row.date === "TODAY" ? "#3f6157" : "#9b6b62",
      fontFamily: "monospace",
      fontSize: "10px",
    }).setOrigin(0, 0.5);
    const statusLabel = this.add.text(30, 0, row.status, {
      color: violation ? "#a5453a" : "#2c7a55",
      fontFamily: "monospace",
      fontSize: "11px",
      fontStyle: "bold",
    }).setOrigin(0, 0.5);
    const ownerLabel = this.add.text(96, 0, row.owner, {
      color: "#527267",
      fontFamily: "monospace",
      fontSize: "9px",
    }).setOrigin(1, 0.5);
    return this.add.container(x, y, [background, idLabel, dateLabel, statusLabel, ownerLabel]).setDepth(8);
  }

  private layoutAuditRows() {
    let slot = 0;
    for (const row of this.s2fRows) {
      if (row.visible) {
        row.container.setVisible(true);
        this.tweens.add({
          targets: row.container,
          x: 500,
          y: 110 + slot * 52,
          alpha: 1,
          duration: 420,
          ease: "Sine.InOut",
        });
        slot += 1;
      } else {
        this.tweens.add({
          targets: row.container,
          alpha: 0,
          duration: 260,
          ease: "Sine.In",
          onComplete: () => row.container.setVisible(false),
        });
      }
    }
  }

  private createSession3Sheet1MissionObjects() {
    this.s3s1IfHighlight = this.add.image(280, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0x71d8cb).setAlpha(0.38).setDepth(7);
    this.s3s1IfTerminal = this.add.image(280, 442, "office-ref-terminal")
      .setDisplaySize(62, 78).setDepth(8);
    const ifTerminalBody = this.addWall(280, 442, 52, 66, 0);
    this.terminal = this.s3s1IfTerminal;
    this.registerHideTarget([this.s3s1IfHighlight, this.s3s1IfTerminal], [ifTerminalBody], "LOCKED");

    this.s3s1InstallConsole = this.add.image(600, 560, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const consoleBody = this.addWall(600, 560, 56, 42, 0);
    this.registerHideTarget([this.s3s1InstallConsole], [consoleBody], "LOCKED");

    this.s3s1CoffeeHighlight = this.add.image(440, 560, "office-ref-itemHighlight")
      .setDisplaySize(70, 70).setTint(0xffd66e).setAlpha(0.32).setDepth(7);
    this.s3s1CoffeeButton = this.add.image(440, 560, "office-ref-scanner")
      .setDisplaySize(58, 66).setDepth(8);
    const coffeeBody = this.addWall(440, 560, 48, 54, 0);
    this.registerHideTarget([this.s3s1CoffeeHighlight, this.s3s1CoffeeButton], [coffeeBody], "LOCKED");

    // G4 condition cell and the yellow/blue IF wiring.
    this.s3s1ConditionCell = this.add.rectangle(700, 200, CELL_WIDTH, CELL_HEIGHT, 0xf2d875, 0.14)
      .setStrokeStyle(2, 0xd8b24a, 0.8).setDepth(6);
    this.s3s1TriggerLine = this.add.line(0, 0, 460, 200, 700, 200, 0xe4c65c, 0.85)
      .setOrigin(0, 0).setLineWidth(3).setDepth(6);
    this.s3s1ResultLine = this.add.line(0, 0, 700, 220, 840, 234, 0x6fa8d8, 0.85)
      .setOrigin(0, 0).setLineWidth(3).setDepth(6);

    this.s3s1Employee = this.add.image(this.s3s1EmployeeHome.x, this.s3s1EmployeeHome.y, "office-ref-coworkerFront")
      .setDisplaySize(58, 80).setDepth(16);

    this.s3s1Door = this.add.image(840, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s3s1DoorBody = this.addWall(840, 234, 58, 88, 0);

    this.s3s1StatusLabel = this.add.text(600, 300, "IF WAITING · CURRENT RESULT=FALSE", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    this.s3s1LogHighlight = this.add.image(1120, 180, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s3s1Log = this.add.image(1120, 180, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s3s1Outbox = this.add.image(1200, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1200, 442, 52, 62, 0);
    this.terminalHighlight = this.add.image(1200, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s3s1Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1400, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1400, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession3Sheet2MissionObjects() {
    // First IF area (immediate TRUE): jammed printer + install console + H5 door.
    this.s3s2Printer = this.add.image(300, 300, "office-ref-copier")
      .setDisplaySize(72, 88).setTint(0xe0b48a).setDepth(8);
    const printerBody = this.addWall(300, 300, 60, 74, 0);
    this.registerHideTarget([this.s3s2Printer], [printerBody], "LOCKED");

    this.s3s2ConsoleA = this.add.image(400, 560, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const consoleABody = this.addWall(400, 560, 56, 42, 0);
    this.terminal = this.s3s2ConsoleA;
    this.registerHideTarget([this.s3s2ConsoleA], [consoleABody], "LOCKED");

    this.s3s2Door1 = this.add.image(680, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s3s2Door1Body = this.addWall(680, 234, 58, 88, 0);

    // Second IF area (delayed TRUE): charge node, console B, worker, repair button, N5 door.
    this.s3s2RechargeNode = this.add.image(800, 320, "office-ref-chargeNode")
      .setDisplaySize(58, 58).setDepth(8);
    const rechargeBody = this.addWall(800, 320, 48, 48, 0);
    this.registerHideTarget([this.s3s2RechargeNode], [rechargeBody], "LOCKED");

    this.s3s2ConsoleB = this.add.image(860, 560, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const consoleBBody = this.addWall(860, 560, 56, 42, 0);
    this.registerHideTarget([this.s3s2ConsoleB], [consoleBBody], "LOCKED");

    this.s3s2Worker = this.add.image(this.s3s2WorkerHome.x, this.s3s2WorkerHome.y, "office-ref-coworkerFront")
      .setDisplaySize(58, 80).setDepth(16);

    this.s3s2ConditionCell = this.add.rectangle(1000, 220, CELL_WIDTH, CELL_HEIGHT, 0xf2d875, 0.14)
      .setStrokeStyle(2, 0xd8b24a, 0.8).setDepth(6);
    this.s3s2ResultLine = this.add.line(0, 0, 1000, 234, 1120, 234, 0x6fa8d8, 0.85)
      .setOrigin(0, 0).setLineWidth(3).setDepth(6);

    this.s3s2RepairHighlight = this.add.image(860, 700, "office-ref-itemHighlight")
      .setDisplaySize(70, 70).setTint(0xffd66e).setAlpha(0.32).setDepth(7);
    this.s3s2RepairButton = this.add.image(860, 700, "office-ref-scanner")
      .setDisplaySize(58, 66).setDepth(8);
    const repairBody = this.addWall(860, 700, 48, 54, 0);
    this.registerHideTarget([this.s3s2RepairHighlight, this.s3s2RepairButton], [repairBody], "LOCKED");

    this.s3s2Door2 = this.add.image(1120, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s3s2Door2Body = this.addWall(1120, 234, 58, 88, 0);

    this.s3s2Cctv = this.add.image(900, 470, "office-ref-cctv")
      .setDisplaySize(62, 62).setDepth(9);

    this.s3s2StatusLabel = this.add.text(560, 330, "IF#1 READY · IF#2 WAITING", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    // Submission area past N5.
    this.s3s2TemplateHighlight = this.add.image(1320, 180, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s3s2Template = this.add.image(1320, 180, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s3s2Outbox = this.add.image(1400, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1400, 442, 52, 62, 0);
    this.terminalHighlight = this.add.image(1400, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s3s2Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1560, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1560, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createSession3Sheet3MissionObjects() {
    // Conveyor F4:J4 with the document and the J4 sensor, all hidden together as ROW_4.
    const conveyor = this.add.rectangle(600, this.s3s3RowY, 420, 30, 0x8a99a2, 0.55)
      .setStrokeStyle(2, 0x5f7079).setDepth(4);
    this.s3s3Sensor = this.add.rectangle(760, this.s3s3RowY, CELL_WIDTH, CELL_HEIGHT, 0xf2d875, 0.12)
      .setStrokeStyle(2, 0xd8b24a, 0.8).setDepth(5);
    this.s3s3Document = this.add.image(this.s3s3CellX[0], this.s3s3RowY, "office-ref-contractDocument")
      .setDisplaySize(40, 48).setDepth(8);
    this.registerHideTarget([conveyor, this.s3s3Sensor, this.s3s3Document], [], "ROW_4");

    this.s3s3IfHighlight = this.add.image(400, 560, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0x71d8cb).setAlpha(0.38).setDepth(7);
    this.s3s3IfConsole = this.add.image(400, 560, "office-ref-sensorPad")
      .setDisplaySize(68, 54).setTint(0x7fc7a5).setDepth(8);
    const consoleBody = this.addWall(400, 560, 56, 42, 0);
    this.terminal = this.s3s3IfConsole;
    this.registerHideTarget([this.s3s3IfHighlight, this.s3s3IfConsole], [consoleBody], "LOCKED");

    this.s3s3Door = this.add.image(920, 234, "office-ref-exitLocked")
      .setDisplaySize(72, 96).setDepth(9);
    this.s3s3DoorBody = this.addWall(920, 234, 58, 88, 0);
    this.s3s3ResultLine = this.add.line(0, 0, 760, this.s3s3RowY, 920, 234, 0x6fa8d8, 0.7)
      .setOrigin(0, 0).setLineWidth(3).setDepth(6);

    this.s3s3StatusLabel = this.add.text(600, 300, "IF WAITING · DOCUMENT @ F4", {
      backgroundColor: "#2a2320",
      color: "#f0c9a6",
      fontFamily: "monospace",
      fontSize: "15px",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(12);

    this.s3s3Cctv = this.add.image(1040, 560, "office-ref-cctv")
      .setDisplaySize(62, 62).setDepth(9);

    this.s3s3TemplateHighlight = this.add.image(1120, 180, "office-ref-itemHighlight")
      .setDisplaySize(80, 80).setTint(0xffd66e).setAlpha(0.4).setDepth(7);
    this.s3s3Template = this.add.image(1120, 180, "office-ref-approvalDocument")
      .setDisplaySize(48, 56).setDepth(8);

    this.s3s3Outbox = this.add.image(1200, 442, "office-ref-saveSlot")
      .setDisplaySize(62, 72).setDepth(8);
    const outboxBody = this.addWall(1200, 442, 52, 62, 0);
    this.terminalHighlight = this.add.image(1200, 442, "office-ref-itemHighlight")
      .setDisplaySize(82, 82).setTint(0xffd66e).setAlpha(0.34).setDepth(7);
    this.registerHideTarget([this.terminalHighlight, this.s3s3Outbox], [outboxBody], "LOCKED");

    this.exitDoor = this.add.image(1360, 442, "office-ref-exitLocked")
      .setDisplaySize(72, 98).setDepth(8);
    const exitBody = this.addWall(1360, 442, 58, 86, 0);
    this.registerHideTarget([this.exitDoor], [exitBody], "LOCKED");

    this.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 48, "", {
      backgroundColor: "#18352f",
      color: "#f7f3d4",
      fontFamily: "sans-serif",
      fontSize: "20px",
      padding: { x: 14, y: 9 },
    }).setOrigin(0.5).setDepth(50);
  }

  private createTaskCard(
    x: number,
    y: number,
    name: string,
    role: "TEAM_LEADER" | "FACILITIES",
    priority: number,
  ) {
    const teamLeader = role === "TEAM_LEADER";
    const background = this.add.rectangle(0, 0, 104, 62, 0xf3f6ef, 0.96)
      .setStrokeStyle(2, teamLeader ? 0x6f9d86 : 0x9f7468);
    const nameLabel = this.add.text(0, -16, name, {
      color: "#24463d",
      fontFamily: "monospace",
      fontSize: name.length > 12 ? "9px" : "10px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    const roleLabel = this.add.text(0, 2, role, {
      color: teamLeader ? "#527267" : "#9b6b62",
      fontFamily: "monospace",
      fontSize: "9px",
    }).setOrigin(0.5);
    const priorityLabel = this.add.text(0, 18, `PRIORITY ${priority}`, {
      color: "#3f6157",
      fontFamily: "monospace",
      fontSize: "9px",
    }).setOrigin(0.5);
    return this.add.container(x, y, [background, nameLabel, roleLabel, priorityLabel]).setDepth(8);
  }

  private createClearanceCard(x: number, y: number, name: string, clearance: number | null) {
    const background = this.add.rectangle(0, 0, 104, 50, 0xf3f6ef, 0.96)
      .setStrokeStyle(2, (clearance ?? -1) >= 2 ? 0x6f9d86 : 0x9f7468);
    const nameLabel = this.add.text(0, -9, name, {
      color: "#24463d",
      fontFamily: "monospace",
      fontSize: name.length > 11 ? "9px" : "11px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    const clearanceLabel = this.add.text(0, 11, `CLEARANCE ${clearance ?? "-"}`, {
      color: clearance === null ? "#9b6b62" : "#527267",
      fontFamily: "monospace",
      fontSize: "9px",
    }).setOrigin(0.5);
    return this.add.container(x, y, [background, nameLabel, clearanceLabel]).setDepth(8);
  }

  private createFormulaPanel() {
    const backdrop = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 760, 300, 0x132b27, 0.96)
      .setStrokeStyle(4, 0x61d8ca);
    const title = this.add.text(700, 348, "CELL EDIT MODE · SELECT TARGET", {
      color: "#61d8ca", fontFamily: "monospace", fontSize: "24px", fontStyle: "bold",
    });
    this.formulaTitle = title;
    this.formulaLabel = this.add.text(700, 396, "fx  =HIDE(COLUMN_F)", {
      backgroundColor: "#f4f7ee", color: "#17382f", fontFamily: "monospace",
      fontSize: "28px", padding: { x: 18, y: 13 },
    });
    this.inspectionLabel = this.add.text(700, 463, "F열 · OBJECTS 2 · RESULT UNKNOWN", {
      color: "#a9c7bd", fontFamily: "monospace", fontSize: "18px",
    });
    this.executeLabel = this.add.text(700, 508, "A–Z 열 선택 · 1–18 행 입력 · ENTER 미리보기\nSPACE 편집 취소", {
      color: "#d8e6df", fontFamily: "sans-serif", fontSize: "18px", lineSpacing: 8,
    });
    this.formulaPanel = this.add.container(0, 0, [
      backdrop,
      title,
      this.formulaLabel,
      this.inspectionLabel,
      this.executeLabel,
    ])
      .setDepth(100).setVisible(false);
  }

  private createInput() {
    if (!this.input.keyboard) return;
    this.keys = this.input.keyboard.addKeys({
      up: "W", down: "S", left: "A", right: "D",
      edit: "SPACE", execute: "ENTER", interact: "E", copy: "C", paste: "V",
    }) as OfficeKeys;
    this.input.keyboard.on("keydown", this.handleEditTyping, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.handleEditTyping, this);
    });
  }

  private handleEditTyping(event: KeyboardEvent) {
    if (!this.editMode) return;
    // Custom-edit sheets drive their own panels; only generic ROW/COLUMN HIDE
    // sheets (and S3S3 while HIDE-selecting) accept A-Z / digit selection.
    if (
      this.isSession2Sheet1() || this.isSession2Sheet2() || this.isSession2Sheet3()
      || this.isSession2Sheet4() || this.isSession2Final()
      || this.isSession3Sheet1() || this.isSession3Sheet2()
      || (this.isSession3Sheet3() && this.s3s3IfEditing)
    ) return;
    const key = event.key.toUpperCase();
    if (/^[A-Z]$/.test(key)) {
      this.selectedEditTarget = { kind: "column", index: key.charCodeAt(0) - 65 };
      this.rowInput = "";
      this.previewArmed = false;
      this.updateEditSelection();
      return;
    }
    if (!/^\d$/.test(key)) return;

    const now = this.time.now;
    if (now - this.rowInputAt > 1000) this.rowInput = "";
    this.rowInputAt = now;
    const candidate = `${this.rowInput}${key}`.replace(/^0+/, "");
    const row = Number(candidate);
    if (row >= 1 && row <= WORLD_ROWS) {
      this.rowInput = candidate;
      this.selectedEditTarget = { kind: "row", index: row - 1 };
    } else {
      const singleRow = Number(key);
      this.rowInput = singleRow >= 1 ? key : "";
      if (singleRow >= 1) {
        this.selectedEditTarget = { kind: "row", index: singleRow - 1 };
      }
    }
    this.previewArmed = false;
    this.updateEditSelection();
  }

  private updateMovement() {
    if (!this.player || !this.keys) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);
    if (this.editMode) {
      this.stopWalker(this.player, "player", this.playerFacing);
      this.syncShadow(this.player, this.playerShadow);
      return;
    }

    const x = (this.keys.left.isDown ? -1 : 0) + (this.keys.right.isDown ? 1 : 0);
    const y = (this.keys.up.isDown ? -1 : 0) + (this.keys.down.isDown ? 1 : 0);
    body.setVelocity(x * PLAYER_SPEED, y * PLAYER_SPEED).velocity.normalize().scale(
      x || y ? PLAYER_SPEED : 0,
    );
    if (Math.abs(x) > Math.abs(y)) {
      this.playerFacing = x < 0 ? "left" : "right";
    } else if (y !== 0) {
      this.playerFacing = y < 0 ? "back" : "front";
    }
    if (x !== 0 || y !== 0) {
      this.player.play(`office-ref-player-walk-${this.playerFacing}`, true);
    } else {
      this.stopWalker(this.player, "player", this.playerFacing);
    }
    this.syncShadow(this.player, this.playerShadow);
    const column = String.fromCharCode(
      65 + Phaser.Math.Clamp(Math.floor(this.player.x / CELL_WIDTH), 0, WORLD_COLUMNS - 1),
    );
    const row = Phaser.Math.Clamp(
      Math.floor(this.player.y / CELL_HEIGHT) + 1,
      1,
      WORLD_ROWS,
    );
    useGameStore.getState().setPlayerPosition(`${column}${row}`);
  }

  private updateGuard(time: number, delta: number) {
    if (!this.player) return;
    this.guardDirection = this.updateGuardActor(
      this.guard,
      this.guardShadow,
      this.guardAxis,
      this.guardMinimum,
      this.guardMaximum,
      this.guardDirection,
      time,
      delta,
    );
    this.secondGuardDirection = this.updateGuardActor(
      this.secondGuard,
      this.secondGuardShadow,
      this.secondGuardAxis,
      this.secondGuardMinimum,
      this.secondGuardMaximum,
      this.secondGuardDirection,
      time,
      delta,
    );
    this.updateSheet2Cctv(time);
    this.updateSheet4Cctv(time);
    this.updateSession1FinalSecurity(time);
    this.updateSession1FinalManager(time);
    this.updateSession2Sheet2Cctv(time);
    this.updateSession2Sheet3Cctv(time);
    this.updateSession2Sheet3Filter(time);
    this.updateSession2Sheet4(time);
    this.updateSession2Final(time);
    this.updateSession3Sheet2Cctv(time);
    this.updateSession3Sheet3(time, delta);
  }

  private updateGuardActor(
    guard: Phaser.Physics.Arcade.Sprite | undefined,
    shadow: Phaser.GameObjects.Ellipse | undefined,
    axis: "horizontal" | "vertical",
    minimum: number,
    maximum: number,
    direction: 1 | -1,
    time: number,
    delta: number,
  ): 1 | -1 {
    if (
      !guard ||
      !this.player ||
      !guard.visible ||
      !(guard.body as Phaser.Physics.Arcade.Body).enable
    ) return direction;
    const coordinate = axis === "vertical" ? guard.y : guard.x;
    if (coordinate >= maximum) direction = -1;
    if (coordinate <= minimum) direction = 1;
    const patrolSpeed = this.editMode ? 14 : 70;
    const nextCoordinate = Phaser.Math.Clamp(
      coordinate + direction * patrolSpeed * (delta / 1000),
      minimum,
      maximum,
    );
    if (axis === "vertical") guard.setY(nextCoordinate);
    else guard.setX(nextCoordinate);
    (guard.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
    const facing: WalkDirection = axis === "vertical"
      ? (direction > 0 ? "front" : "back")
      : (direction > 0 ? "right" : "left");
    guard.play(`office-ref-guard-walk-${facing}`, true);
    guard.anims.timeScale = this.editMode ? 0.35 : 1;
    this.syncShadow(guard, shadow);

    const along = axis === "vertical"
      ? (this.player.y - guard.y) * direction
      : (this.player.x - guard.x) * direction;
    const across = axis === "vertical"
      ? Math.abs(this.player.x - guard.x)
      : Math.abs(this.player.y - guard.y);
    if (along > -22 && along < 260 && across < 62) this.triggerAlert(time, "GUARD");
    return direction;
  }

  private updateSheet2Cctv(time: number) {
    if (!this.isSession1Sheet2() || !this.player || !this.sheet2Cctv?.visible) return;
    const inCameraLane = this.player.x > 780 && this.player.x < 1160
      && Math.abs(this.player.y - this.sheet2Cctv.y) < 70;
    if (inCameraLane) this.triggerAlert(time, "CCTV");
  }

  private updateSheet4Cctv(time: number) {
    if (!this.isSession1Sheet4() || !this.player || this.sheet4CctvDisabled) return;
    const [northCamera, eastCamera] = this.sheet4Cctvs;
    const northLane = northCamera?.visible
      && this.player.x > 920
      && this.player.x < 1260
      && Math.abs(this.player.y - northCamera.y) < 68;
    const eastLane = eastCamera?.visible
      && this.player.x > 1080
      && this.player.x < 1370
      && Math.abs(this.player.y - eastCamera.y) < 72;
    if (northLane || eastLane) this.triggerAlert(time, "CCTV");
  }

  private updateSession1FinalSecurity(time: number) {
    if (!this.isSession1Final() || !this.player) return;
    const [reviewCamera, exitCamera] = this.finalCctvs;
    const reviewLane = reviewCamera?.visible
      && this.player.x > 820
      && this.player.x < 1020
      && Math.abs(this.player.y - reviewCamera.y) < 64;
    const exitLane = exitCamera?.visible
      && this.player.x > 1120
      && this.player.x < 1370
      && Math.abs(this.player.y - exitCamera.y) < 72;
    if (reviewLane || exitLane) this.triggerAlert(time, "CCTV");
  }

  private updateSession1FinalManager(time: number) {
    if (!this.isSession1Final() || !this.finalManagerLabel) return;
    if (this.terminalChecked) {
      this.finalManagerLabel.setText("PASS STORED · RECOVERY DISABLED").setColor("#9be0b4");
      return;
    }
    const actions = [
      "UNHIDE(ALL)",
      "REMOVE_DUPLICATES()",
      "LOCK_RANDOM_CELL()",
      "ADD_WORK()",
    ] as const;
    const nextAction = actions[this.finalManagerActionIndex % actions.length];
    const remaining = Math.max(0, Math.ceil((this.finalManagerNextActionAt - time) / 1000));
    if (remaining !== this.finalLastManagerSecond) {
      this.finalLastManagerSecond = remaining;
      this.finalManagerLabel
        .setText(`MANAGER · ${nextAction} · ${remaining}s`)
        .setColor(remaining <= 2 ? "#ff9b88" : "#f2d875");
    }
    if (time < this.finalManagerNextActionAt) return;

    if (nextAction === "UNHIDE(ALL)") {
      this.hideUntil = 0;
      this.restoreActiveHideTargets();
    } else if (nextAction === "REMOVE_DUPLICATES()") {
      this.finalBonusPasted = false;
      this.finalBorrowedResult?.destroy();
      this.finalBorrowedResult = undefined;
      this.finalBorrowTarget?.setVisible(true).clearTint();
    } else if (nextAction === "LOCK_RANDOM_CELL()") {
      this.finalBonusLockedUntil = time + 6000;
      this.finalProjectBonus?.setTint(0xc46f6f);
      this.time.delayedCall(6000, () => this.finalProjectBonus?.clearTint());
    } else {
      this.finalWorkPenalty = 5;
      this.time.delayedCall(6000, () => {
        if (this.terminalChecked) return;
        this.finalWorkPenalty = 0;
        this.updateFinalScoreDisplay();
      });
    }

    this.finalManagerActionIndex += 1;
    this.finalManagerNextActionAt = time + 8000;
    this.finalLastManagerSecond = -1;
    this.finalManager?.setTint(0xff9b88);
    this.time.delayedCall(260, () => this.finalManager?.clearTint());
    this.updateFinalScoreDisplay();
    useGameStore.getState().setSelectedCell("K3", `=${nextAction}`);
  }

  private updateSession2Sheet2Cctv(time: number) {
    if (!this.isSession2Sheet2() || !this.player || !this.s2s2Cctv?.visible) return;
    const inCameraLane = this.player.x > 420
      && this.player.x < 700
      && Math.abs(this.player.y - this.s2s2Cctv.y) < 64;
    if (inCameraLane) this.triggerAlert(time, "CCTV");
  }

  private updateSession2Sheet3Cctv(time: number) {
    if (!this.isSession2Sheet3() || !this.player || !this.s2s3Cctv?.visible) return;
    const inCameraLane = this.player.x > 930
      && this.player.x < 1240
      && Math.abs(this.player.y - this.s2s3Cctv.y) < 62;
    if (inCameraLane) this.triggerAlert(time, "CCTV");
  }

  private updateSession2Sheet3Filter(time: number) {
    if (!this.isSession2Sheet3() || !this.s2s3FilterActive) return;
    if (!this.s2s3LateStaffSpawned && time >= this.s2s3LateStaffAt) {
      this.s2s3LateStaffSpawned = true;
      this.s2s3LateStaff?.setVisible(true).setAlpha(1);
      useGameStore.getState().setSelectedCell(
        "J4",
        "=FILTER.RECHECK(LATE_STAFF,CLEARANCE=1) // EXCLUDED",
      );
      this.time.delayedCall(420, () => {
        if (!this.s2s3FilterActive) return;
        this.s2s3LateStaff?.setVisible(false);
      });
    }
    if (time < this.s2s3FilterUntil) return;

    this.s2s3FilterActive = false;
    this.s2s3QueueEntries.forEach((entry) => entry.container.setVisible(true).setAlpha(1));
    this.s2s3LateStaff?.setVisible(true).setAlpha(1);
    this.s2s3Gate?.setTexture("office-ref-exitLocked");
    if (this.s2s3GateBody) {
      this.movePlayerOutside(this.s2s3GateBody);
      const gateBody = this.arcadeBody(this.s2s3GateBody);
      if (gateBody) gateBody.enable = true;
    }
    useGameStore.getState().setSelectedCell("K5", "=AUDIT_ESCORT.EXPIRED() // GATE CLOSED");
  }

  private updateSession2Sheet4(time: number) {
    if (!this.isSession2Sheet4() || !this.player) return;
    if (this.s2s4Cctv?.visible) {
      const inCameraLane = this.player.x > 930
        && this.player.x < 1240
        && Math.abs(this.player.y - this.s2s4Cctv.y) < 62;
      if (inCameraLane) this.triggerAlert(time, "CCTV");
    }
    // 20초 WRITE ACCESS 창이 끝나면 재연결이 필요하다. 적용된 편집은 유지된다.
    if (this.s2s4WriteUnlocked && !this.s2s4Sorted && time >= this.s2s4WriteUntil) {
      this.s2s4WriteUnlocked = false;
      this.s2s4DispatchHighlight?.clearTint().setTint(0xd97979);
      useGameStore.getState().setSelectedCell("E8", "=WRITE_ACCESS.EXPIRED() // 재연결 필요");
    }
  }

  private updateSession3Sheet3(time: number, delta: number) {
    if (!this.isSession3Sheet3() || !this.player) return;
    if (this.s3s3Cctv?.visible) {
      const inCameraLane = this.player.x > 960
        && this.player.x < 1160
        && Math.abs(this.player.y - this.s3s3Cctv.y) < 60;
      if (inCameraLane) this.triggerAlert(time, "CCTV");
    }

    // Conveyor advances the document 1 cell/sec, but pauses while ROW_4 is HIDDEN.
    if (
      this.s3s3ConveyorStarted
      && !this.s3s3DocAtSensor
      && this.hideUntil <= time
    ) {
      this.s3s3DocTimer += delta;
      if (this.s3s3DocTimer >= 1000 && this.s3s3DocIndex < this.s3s3CellX.length - 1) {
        this.s3s3DocTimer -= 1000;
        this.s3s3DocIndex += 1;
        this.s3s3Document?.setX(this.s3s3CellX[this.s3s3DocIndex]);
        const cellName = ["F4", "G4", "H4", "I4", "J4"][this.s3s3DocIndex];
        if (this.s3s3DocIndex >= this.s3s3CellX.length - 1) {
          this.s3s3DocAtSensor = true;
          this.openSession3Sheet3Door(time);
        } else {
          this.s3s3StatusLabel?.setText(`IF WAITING · DOCUMENT @ ${cellName}`).setColor("#f0c9a6");
        }
      }
    }

    // Timed L5 window: pass within 3s or the conveyor resets for another attempt.
    if (this.s3s3DoorOpenUntil > 0 && !this.s3s3Passed) {
      if (this.player.x > 960) {
        this.s3s3Passed = true;
        this.s3s3DoorOpenUntil = 0;
        this.terminalChecked = true;
        this.s3s3StatusLabel?.setText("L5 통과 · TRIGGER_TEMPLATE 확보").setColor("#bfe6c4");
        useGameStore.getState().updateKeeper({ terminalChecked: true });
        useGameStore.getState().setSelectedCell("L5", "=IF(DOCUMENT.IN(J4),DOOR_L5.OPEN_FOR(3)) // PASSED");
      } else if (time >= this.s3s3DoorOpenUntil) {
        this.resetSession3Sheet3Conveyor();
      }
    }
  }

  private openSession3Sheet3Door(time: number) {
    this.s3s3DoorOpenUntil = time + 3000;
    this.s3s3Door?.setTexture("office-ref-exitOpen");
    const doorBody = this.s3s3DoorBody ? this.arcadeBody(this.s3s3DoorBody) : undefined;
    if (doorBody) doorBody.enable = false;
    this.s3s3ResultLine?.setStrokeStyle(3, 0x6fe08c, 0.95);
    this.s3s3StatusLabel?.setText("IF TRUE · L5 OPEN 3초 · 지금 통과").setColor("#cfe7d2");
    useGameStore.getState().setSelectedCell("J4", "=IF(DOCUMENT.IN(J4),DOOR_L5.OPEN_FOR(3)) // TRUE");
  }

  private resetSession3Sheet3Conveyor() {
    this.s3s3DoorOpenUntil = 0;
    this.s3s3DocAtSensor = false;
    this.s3s3DocIndex = 0;
    this.s3s3DocTimer = 0;
    this.s3s3Document?.setX(this.s3s3CellX[0]);
    this.s3s3Door?.setTexture("office-ref-exitLocked");
    const doorBody = this.s3s3DoorBody ? this.arcadeBody(this.s3s3DoorBody) : undefined;
    if (doorBody) {
      this.movePlayerOutside(this.s3s3DoorBody!);
      doorBody.enable = true;
    }
    this.s3s3ResultLine?.setStrokeStyle(3, 0x6fa8d8, 0.7);
    this.s3s3StatusLabel?.setText("첫 개방 놓침 · 문서 F4 복귀 · 재시도").setColor("#f0c9a6");
    useGameStore.getState().setSelectedCell("L5", "=DOOR_L5.CLOSED() // 재시도");
  }

  private updateSession3Sheet2Cctv(time: number) {
    if (!this.isSession3Sheet2() || !this.player || !this.s3s2Cctv?.visible) return;
    const inCameraLane = this.player.x > 720
      && this.player.x < 1120
      && Math.abs(this.player.y - this.s3s2Cctv.y) < 60;
    if (inCameraLane) this.triggerAlert(time, "CCTV");
  }

  private updateSession2Final(time: number) {
    if (!this.isSession2Final() || !this.player) return;
    if (this.s2fCctv?.visible) {
      const inCameraLane = this.player.x > 940
        && this.player.x < 1260
        && Math.abs(this.player.y - this.s2fCctv.y) < 62;
      if (inCameraLane) this.triggerAlert(time, "CCTV");
    }

    // FILTER 8초 창이 끝나기 전에 Q3 제출을 못하면 표본이 무너진다.
    if (
      this.s2fFiltered
      && !this.s2fSubmitted
      && this.s2fSampleUntil > 0
      && time >= this.s2fSampleUntil
    ) {
      this.revertSession2FinalAudit("FILTER_WINDOW_EXPIRED");
    }

    if (!this.s2fChiefLabel) return;
    if (this.s2fSubmitted) {
      this.s2fChiefLabel.setText("VERDICT STORED · COUNTIF OFF").setColor("#9be0b4");
      return;
    }
    const actions = ["SHOW_ALL()", "SORT_BY(ROW_ID)", "LOCK_FIELD()", "APPEND_RECHECK()"] as const;
    const nextAction = actions[this.s2fChiefActionIndex % actions.length];
    const remaining = Math.max(0, Math.ceil((this.s2fChiefNextAt - time) / 1000));
    if (remaining !== this.s2fChiefLastSecond) {
      this.s2fChiefLastSecond = remaining;
      this.s2fChiefLabel
        .setText(`CHIEF · ${nextAction} · ${remaining}s`)
        .setColor(remaining <= 2 ? "#ff9b88" : "#f2d875");
    }
    if (time < this.s2fChiefNextAt) return;

    // 감사표 복구 순환. 미제출 상태의 FILTER/SORT 작업을 되돌린다.
    if (this.s2fFiltered || this.s2fSorted) {
      this.revertSession2FinalAudit(nextAction);
    }
    this.s2fChiefActionIndex += 1;
    this.s2fChiefNextAt = time + 10000;
    this.s2fChiefLastSecond = -1;
    this.s2fChief?.setTint(0xff9b88);
    this.time.delayedCall(260, () => this.s2fChief?.clearTint());
    useGameStore.getState().setSelectedCell("N7", `=${nextAction}`);
  }

  private revertSession2FinalAudit(reason: string) {
    if (this.s2fSubmitted) return;
    let refund = 0;
    if (this.s2fFiltered) refund += 3;
    if (this.s2fSorted) refund += 2;
    if (refund > 0) {
      this.calc = Math.min(7, this.calc + refund);
      useGameStore.getState().updateKeeper({ calc: this.calc });
    }
    this.s2fFiltered = false;
    this.s2fFilterPreviewed = false;
    this.s2fSorted = false;
    this.s2fSortPreviewed = false;
    this.s2fSampleValid = false;
    this.s2fSampleUntil = 0;
    this.s2fRows.sort((left, right) => left.id - right.id);
    this.s2fRows.forEach((row) => {
      row.visible = true;
    });
    this.layoutAuditRows();
    this.s2fAuditStation?.clearTint().setTint(0x7fc7a5);
    this.s2fVerdictLabel
      ?.setText("ACCESS_VERDICT = QUARANTINE · SAMPLE VIOLATION 2")
      .setColor("#f0c9a6");
    if (this.editMode) this.setEditMode(false);
    useGameStore.getState().setSelectedCell("L2", `=RESTORE(AUDIT_ROWS) // ${reason}`);
  }

  private triggerAlert(time: number, source: "CCTV" | "GUARD") {
    if (!this.player || time - this.lastAlertAt <= 1200) return;
    this.lastAlertAt = time;
    const state = useGameStore.getState();
    state.updateKeeper({ alerts: state.keeperAlerts + 1 });
    state.setSelectedCell(
      this.cellAt(this.player.x, this.player.y),
      `#POLICY! ${source} DETECTION`,
    );
    this.player.setPosition(this.playerStart.x, this.playerStart.y);
    this.player.setTint(0xff7777);
    this.time.delayedCall(280, () => this.player?.clearTint());
  }

  private updateInteractionPrompt() {
    if (!this.player || !this.prompt || !this.terminal || !this.exitDoor) return;
    if (this.isSession1Sheet2()) {
      this.updateSession1Sheet2Prompt();
      return;
    }
    if (this.isSession1Sheet3()) {
      this.updateSession1Sheet3Prompt();
      return;
    }
    if (this.isSession1Sheet4()) {
      this.updateSession1Sheet4Prompt();
      return;
    }
    if (this.isSession1Final()) {
      this.updateSession1FinalPrompt();
      return;
    }
    if (this.isSession2Sheet1()) {
      this.updateSession2Sheet1Prompt();
      return;
    }
    if (this.isSession2Sheet2()) {
      this.updateSession2Sheet2Prompt();
      return;
    }
    if (this.isSession2Sheet3()) {
      this.updateSession2Sheet3Prompt();
      return;
    }
    if (this.isSession2Sheet4()) {
      this.updateSession2Sheet4Prompt();
      return;
    }
    if (this.isSession2Final()) {
      this.updateSession2FinalPrompt();
      return;
    }
    if (this.isSession3Sheet1()) {
      this.updateSession3Sheet1Prompt();
      return;
    }
    if (this.isSession3Sheet2()) {
      this.updateSession3Sheet2Prompt();
      return;
    }
    if (this.isSession3Sheet3()) {
      this.updateSession3Sheet3Prompt();
      return;
    }
    const terminalDistance = Phaser.Math.Distance.BetweenPoints(this.player, this.terminal);
    const exitDistance = Phaser.Math.Distance.BetweenPoints(this.player, this.exitDoor);
    if (this.terminal.visible && terminalDistance < 105) {
      this.prompt.setText(this.terminalChecked ? "목표 확인 완료 · 출입문으로 이동" : `E · ${this.officeSheet.workbook} 확인`);
    } else if (this.exitDoor.visible && exitDistance < 115) {
      this.prompt.setText(this.exitUnlocked ? "E · 퇴근 처리 / PASS" : "출입문 잠김 · 먼저 퇴근 단말기 확인");
    } else {
      this.prompt.setText(`SPACE · 셀 편집 모드  /  ${this.officeSheet.functionName}`);
    }
  }

  private interact() {
    if (!this.player || !this.terminal || !this.exitDoor) return;
    if (this.isSession1Sheet2()) {
      this.interactSession1Sheet2();
      return;
    }
    if (this.isSession1Sheet3()) {
      this.interactSession1Sheet3();
      return;
    }
    if (this.isSession1Sheet4()) {
      this.interactSession1Sheet4();
      return;
    }
    if (this.isSession1Final()) {
      this.interactSession1Final();
      return;
    }
    if (this.isSession2Sheet1()) {
      this.interactSession2Sheet1();
      return;
    }
    if (this.isSession2Sheet2()) {
      this.interactSession2Sheet2();
      return;
    }
    if (this.isSession2Sheet3()) {
      this.interactSession2Sheet3();
      return;
    }
    if (this.isSession2Sheet4()) {
      this.interactSession2Sheet4();
      return;
    }
    if (this.isSession2Final()) {
      this.interactSession2Final();
      return;
    }
    if (this.isSession3Sheet1()) {
      this.interactSession3Sheet1();
      return;
    }
    if (this.isSession3Sheet2()) {
      this.interactSession3Sheet2();
      return;
    }
    if (this.isSession3Sheet3()) {
      this.interactSession3Sheet3();
      return;
    }
    if (
      this.terminal.visible &&
      Phaser.Math.Distance.BetweenPoints(this.player, this.terminal) < 105
    ) {
      this.terminalChecked = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ terminalChecked: true, exitUnlocked: true });
      useGameStore.getState().setSelectedCell(
        this.cellAt(this.terminalPosition.x, this.terminalPosition.y),
        `=OBJECTIVE.COMPLETE("${this.officeSheet.title}")`,
      );
    } else if (
      this.exitDoor.visible &&
      Phaser.Math.Distance.BetweenPoints(this.player, this.exitDoor) < 115 &&
      this.exitUnlocked
    ) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell(
        this.cellAt(this.exitPosition.x, this.exitPosition.y),
        `=SHEET.PASS(${this.officeSheet.session},${this.officeSheet.sheet})`,
      );
    }
  }

  private updateSession1Sheet2Prompt() {
    if (!this.player || !this.prompt || !this.terminal || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (this.exitUnlocked && distanceTo(this.exitDoor) < 115) {
      this.prompt.setText("E · 제출 완료 / EXIT");
    } else if (this.contractDocument?.visible && distanceTo(this.contractDocument) < 92) {
      this.prompt.setText(
        this.usedRow6 && this.usedColumnJ
          ? "E · 계약서 회수 / HANDS"
          : "계약서 잠김 · ROW 6과 COLUMN J 복구 기록 필요",
      );
    } else if (!this.rechargeUsed && distanceTo(this.rechargeNode) < 92) {
      this.prompt.setText("E · 충전 노드 사용 / CALC +2");
    } else if (distanceTo(this.terminal) < 105) {
      this.prompt.setText(
        this.contractSubmitted
          ? "계약서 제출 완료"
          : this.carryingContract
            ? "E · 계약서를 OUTBOX에 제출"
            : "OUTBOX · 먼저 K3 계약서를 회수하세요",
      );
    } else {
      this.prompt.setText(
        this.carryingContract
          ? "계약서 운반 중 · O8 OUTBOX로 이동"
          : "ROW 6과 COLUMN J를 HIDE해 K3 계약서 회수",
      );
    }
  }

  private interactSession1Sheet2() {
    if (!this.player || !this.terminal || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (this.exitUnlocked && distanceTo(this.exitDoor) < 115) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("P8", "=SHEET.PASS(1,2)");
      return;
    }
    if (this.contractDocument?.visible && distanceTo(this.contractDocument) < 92) {
      if (!this.usedRow6 || !this.usedColumnJ) {
        useGameStore.getState().setSelectedCell(
          "K3",
          "#LOCKED! ROW_6 + COLUMN_J 기록 필요",
        );
        return;
      }
      this.carryingContract = true;
      this.contractDocument.setVisible(false);
      this.contractHighlight?.setVisible(false);
      useGameStore.getState().updateKeeper({ terminalChecked: true });
      useGameStore.getState().setSelectedCell("K3", "=HANDS(CONTRACT_DOCUMENT)");
      return;
    }
    if (!this.rechargeUsed && distanceTo(this.rechargeNode) < 92) {
      this.rechargeUsed = true;
      this.calc = Math.min(7, this.calc + 2);
      this.rechargeHighlight?.setVisible(false);
      this.rechargeNode?.setTint(0x78958d);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("E2", "=CALC.RECHARGE(+2)");
      return;
    }
    if (this.carryingContract && distanceTo(this.terminal) < 105) {
      this.carryingContract = false;
      this.contractSubmitted = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true });
      useGameStore.getState().setSelectedCell("O8", "=OUTBOX.SUBMIT(CONTRACT_DOCUMENT)");
    }
  }

  private updateSession1Sheet3Prompt() {
    if (!this.player || !this.prompt || !this.terminal || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.sheet3TrainingTerminal) < 100) {
      this.prompt.setText(
        this.copyPasteUnlocked ? "COPY / PASTE 교육 완료" : "E · COPY / PASTE 교육 활성화",
      );
    } else if (distanceTo(this.sheet3LeaderBadge) < 320 && !this.leaderBadgeCopied) {
      this.prompt.setText(
        this.copyPasteUnlocked ? "C · H3 팀장 출입증 COPY" : "먼저 F8 교육 단말기를 활성화하세요",
      );
    } else if (distanceTo(this.sheet3PasteStation) < 105 && !this.duplicateBadgeEquipped) {
      this.prompt.setText(
        this.leaderBadgeCopied ? "V · 출입증 복제품 PASTE / 장착" : "CLIPBOARD가 비어 있습니다",
      );
    } else if (distanceTo(this.sheet3ApprovalDocument) < 96 && this.sheet3ApprovalDocument?.visible) {
      this.prompt.setText(
        this.duplicateBadgeEquipped ? "E · N3 승인 문서 회수" : "CLEARANCE 불일치",
      );
    } else if (distanceTo(this.terminal) < 96) {
      this.prompt.setText(
        this.approvalSubmitted
          ? "승인 문서 제출 완료"
          : this.approvalCarrying
            ? "E · N2 OUTBOX에 승인 문서 제출"
            : "N3 승인 문서를 먼저 회수하세요",
      );
    } else if (distanceTo(this.sheet3BadgeTray) < 105 && this.approvalSubmitted) {
      this.prompt.setText(
        this.originalBadgeRestored
          ? "원래 사원증 복구 완료"
          : "E · 복제품 반납 / 원래 사원증 장착",
      );
    } else if (distanceTo(this.exitDoor) < 125) {
      this.prompt.setText(
        !this.approvalSubmitted
          ? "EXIT 잠김 · 승인 문서를 제출하세요"
          : this.originalBadgeRestored
            ? "E · 중복 검사 통과 / EXIT"
            : "DUPLICATE 감지 · M7 반납 트레이를 사용하세요",
      );
    } else {
      this.prompt.setText(
        this.duplicateBadgeEquipped
          ? "복제 TEAM_LEADER 배지 장착 중 · K6 보안문 통과 가능"
          : "F8 교육 → H3 COPY → G8 PASTE",
      );
    }
  }

  private interactSession1Sheet3() {
    if (!this.player || !this.terminal || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.sheet3TrainingTerminal) < 100 && !this.copyPasteUnlocked) {
      this.copyPasteUnlocked = true;
      this.sheet3TrainingHighlight?.setTint(0x79d6a5);
      useGameStore.getState().setSelectedCell("F8", "=ENABLE(COPY,PASTE)");
      return;
    }
    if (
      distanceTo(this.sheet3ApprovalDocument) < 96 &&
      this.sheet3ApprovalDocument?.visible &&
      this.duplicateBadgeEquipped
    ) {
      this.approvalCarrying = true;
      this.sheet3ApprovalDocument.setVisible(false);
      this.sheet3ApprovalHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("N3", "=HANDS(APPROVAL_DOCUMENT)");
      return;
    }
    if (distanceTo(this.terminal) < 96 && this.approvalCarrying) {
      this.approvalCarrying = false;
      this.approvalSubmitted = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      useGameStore.getState().updateKeeper({ exitUnlocked: true });
      useGameStore.getState().setSelectedCell("N2", "=OUTBOX.SUBMIT(APPROVAL_DOCUMENT)");
      return;
    }
    if (
      distanceTo(this.sheet3BadgeTray) < 105 &&
      this.approvalSubmitted &&
      !this.originalBadgeRestored
    ) {
      this.duplicateBadgeEquipped = false;
      this.originalBadgeRestored = true;
      this.sheet3BadgeTray?.setTint(0x4f8f70);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().setSelectedCell("M7", "=BADGE.RESTORE(PROBATION_ORIGINAL)");
      return;
    }
    if (distanceTo(this.exitDoor) < 125 && this.approvalSubmitted) {
      if (!this.originalBadgeRestored) {
        this.triggerAlert(this.time.now, "CCTV");
        useGameStore.getState().setSelectedCell("Q9", "#DUPLICATE! EXIT SENSOR");
        return;
      }
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("Q9", "=SHEET.PASS(1,3)");
    }
  }

  private updateSession1Sheet4Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (!this.sheet4PrinterDuplicated && distanceTo(this.sheet4Printer) < 105) {
      this.prompt.setText("C · G8 고장 난 프린터 COPY");
    } else if (!this.sheet4CabinetDuplicated && distanceTo(this.sheet4Cabinet) < 105) {
      this.prompt.setText("C · E7 이동식 서류함 COPY");
    } else if (
      this.sheet4Clipboard === "printer" &&
      !this.sheet4PrinterDuplicated &&
      distanceTo(this.sheet4PrinterTarget) < 115
    ) {
      this.prompt.setText("V · M8 프린터 PASTE · 시설팀 호출");
    } else if (
      this.sheet4Clipboard === "cabinet" &&
      !this.sheet4CabinetDuplicated &&
      distanceTo(this.sheet4CabinetTarget) < 270
    ) {
      this.prompt.setText("V · K4 서류함 PASTE · CCTV 시야 차단");
    } else if (distanceTo(this.sheet4EmergencyRelease) < 105 && !this.sheet4AdminDoorOpen) {
      this.prompt.setText(
        this.sheet4CabinetDuplicated
          ? "E · 비상 해제 승인 · 관리문 열기"
          : "비상 해제 잠김 · K4에 서류함 배치 필요",
      );
    } else if (distanceTo(this.sheet4Colleague) < 105) {
      this.prompt.setText(
        this.sheet4ColleagueRescued
          ? "O3 동료 업무 복구 완료"
          : "E · O3 멈춘 인쇄 작업 복구",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(
        this.sheet4ColleagueRescued
          ? "E · Q10 업무 종료 / EXIT"
          : "EXIT 잠김 · O3 동료 작업을 먼저 복구",
      );
    } else if (!this.sheet4AdminDoorOpen) {
      this.prompt.setText("COLUMN N HIDE 또는 C COPY → V PASTE로 관리문 우회");
    } else {
      this.prompt.setText("관리문 개방 · O3 동료에게 이동");
    }
  }

  private interactSession1Sheet4() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (
      distanceTo(this.sheet4EmergencyRelease) < 105 &&
      this.sheet4CabinetDuplicated &&
      !this.sheet4AdminDoorOpen
    ) {
      this.openSheet4AdminDoor("EMERGENCY_RELEASE");
      return;
    }
    if (distanceTo(this.sheet4Colleague) < 105 && !this.sheet4ColleagueRescued) {
      this.sheet4ColleagueRescued = true;
      this.terminalChecked = true;
      this.exitUnlocked = true;
      this.sheet4Colleague?.setTint(0x93d6ac);
      this.sheet4ColleagueHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ terminalChecked: true, exitUnlocked: true });
      useGameStore.getState().setSelectedCell("O3", "=TASK.RECOVER(PRINT_QUEUE)");
      return;
    }
    if (
      distanceTo(this.exitDoor) < 120 &&
      this.sheet4ColleagueRescued
    ) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("Q10", "=SHEET.PASS(1,4)");
    }
  }

  private updateSession1FinalPrompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    const score = this.currentFinalScore();
    if (distanceTo(this.finalProjectBonus) < 110 && !this.finalBonusCopied) {
      this.prompt.setText(
        this.time.now < this.finalBonusLockedUntil
          ? "F3 PROJECT BONUS · MANAGER LOCKED"
          : "C · F3 PROJECT BONUS +18 COPY",
      );
    } else if (distanceTo(this.finalBorrowTarget) < 115 && !this.finalBonusPasted) {
      this.prompt.setText(
        this.finalBonusCopied
          ? "V · O6 BORROWED RESULT에 +18 PASTE"
          : "BORROWED RESULT 0 · F3 보너스를 먼저 COPY",
      );
    } else if (distanceTo(this.finalRechargeNode) < 100 && !this.finalRechargeUsed) {
      this.prompt.setText("E · E8 CALC 충전 +2 · RECALC 기록 발생");
    } else if (distanceTo(this.finalSubmitTerminal) < 115) {
      this.prompt.setText(
        this.terminalChecked
          ? "PASS 결과 저장 완료 · Q10 EXIT로 이동"
          : score >= 70
            ? `E · P3 평가 제출 · SCORE ${score} PASS`
            : `P3 제출 불가 · SCORE ${score}/70`,
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · Q10 CLOCK OUT / EXIT" : "EXIT 잠김 · 평가 PASS 필요");
    } else {
      this.prompt.setText("F3 COPY → ROW 5 HIDE → O6 PASTE → P3 SUBMIT");
    }
  }

  private interactSession1Final() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.finalRechargeNode) < 100 && !this.finalRechargeUsed) {
      this.finalRechargeUsed = true;
      this.calc = Math.min(7, this.calc + 2);
      this.finalRechargeNode?.setTint(0x78958d);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("E8", "=CALC.RECHARGE(+2) // RECALC");
      return;
    }
    if (distanceTo(this.finalSubmitTerminal) < 115 && !this.terminalChecked) {
      const score = this.currentFinalScore();
      if (score < 70) {
        this.finalSubmitTerminal?.setTint(0xff7777);
        this.time.delayedCall(260, () => this.finalSubmitTerminal?.clearTint());
        useGameStore.getState().setSelectedCell("P3", `#FAIL! SCORE ${score} < 70`);
        return;
      }
      this.terminalChecked = true;
      this.exitUnlocked = true;
      this.finalSubmitTerminal?.setTint(0x79d6a5);
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ terminalChecked: true, exitUnlocked: true });
      useGameStore.getState().setSelectedCell("P3", `=SUBMIT.EVALUATION(${score}) // PASS STORED`);
      this.updateFinalScoreDisplay();
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().completeKeeperLevel(0);
      useGameStore.getState().setSelectedCell("Q10", "=SESSION.PASS(1)");
    }
  }

  private updateSession2Sheet1Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s2s1TrainingTerminal) < 105) {
      this.prompt.setText(
        this.s2s1SortUnlocked ? "D7 SORT 교육 완료" : "E · D7 SORT 함수 활성화",
      );
    } else if (distanceTo(this.s2s1SortStation) < 115) {
      this.prompt.setText(
        !this.s2s1SortUnlocked
          ? "F7 잠김 · D7 교육 단말기를 먼저 확인"
          : this.s2s1QueueValid
            ? "QUEUE_VALID = TRUE · K5 확인문 개방"
            : "SPACE · F7 SORT 수식 편집",
      );
    } else if (distanceTo(this.s2s1Request) < 100 && this.s2s1Request?.visible) {
      this.prompt.setText(
        this.s2s1QueueValid ? "E · N3 부서 배정 요청서 회수" : "N3 잠김 · QUEUE_VALID 필요",
      );
    } else if (distanceTo(this.s2s1Outbox) < 110) {
      this.prompt.setText(
        this.s2s1RequestSubmitted
          ? "O8 OUTBOX 제출 완료"
          : this.s2s1RequestCarrying
            ? "E · O8 부서 배정 요청서 제출"
            : "N3 요청서를 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · P8 EXIT" : "EXIT 잠김 · O8 OUTBOX 제출 필요");
    } else {
      this.prompt.setText("D7 ENABLE → F7 SORT → N3 REQUEST → O8 OUTBOX");
    }
  }

  private interactSession2Sheet1() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s2s1TrainingTerminal) < 105 && !this.s2s1SortUnlocked) {
      this.s2s1SortUnlocked = true;
      this.s2s1TrainingHighlight?.setTint(0x79d6a5);
      useGameStore.getState().setSelectedCell("D7", "=ENABLE(SORT)");
      return;
    }
    if (
      distanceTo(this.s2s1Request) < 100 &&
      this.s2s1Request?.visible &&
      this.s2s1QueueValid
    ) {
      this.s2s1RequestCarrying = true;
      this.s2s1Request.setVisible(false);
      this.s2s1RequestHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("N3", "=HANDS(DEPARTMENT_REQUEST)");
      return;
    }
    if (distanceTo(this.s2s1Outbox) < 110 && this.s2s1RequestCarrying) {
      this.s2s1RequestCarrying = false;
      this.s2s1RequestSubmitted = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true });
      useGameStore.getState().setSelectedCell("O8", "=OUTBOX.SUBMIT(DEPARTMENT_REQUEST)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("P8", "=SHEET.PASS(2,1)");
    }
  }

  private updateSession2Sheet2Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s2s2SortStation) < 115) {
      this.prompt.setText(
        this.s2s2QueueValid
          ? "GROUP_VALID = TRUE · J5 부서문 개방"
          : "SPACE · F3:H4 DEPARTMENT_CODE 정렬",
      );
    } else if (distanceTo(this.s2s2Request) < 100 && this.s2s2Request?.visible) {
      this.prompt.setText(
        this.s2s2QueueValid ? "E · N3 DEPARTMENT_PATCH 회수" : "N3 잠김 · HR 두 명을 F3:G3에 배치",
      );
    } else if (distanceTo(this.s2s2Outbox) < 110) {
      this.prompt.setText(
        this.s2s2RequestSubmitted
          ? "P9 OUTBOX 제출 완료"
          : this.s2s2RequestCarrying
            ? "E · P9 DEPARTMENT_PATCH 제출"
            : "N3 패치를 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · Q9 EXIT" : "EXIT 잠김 · P9 OUTBOX 제출 필요");
    } else {
      this.prompt.setText("F3:H4 SORT → J5 GROUP GATE → N3 PATCH → P9 OUTBOX");
    }
  }

  private interactSession2Sheet2() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (
      distanceTo(this.s2s2Request) < 100 &&
      this.s2s2Request?.visible &&
      this.s2s2QueueValid
    ) {
      this.s2s2RequestCarrying = true;
      this.s2s2Request.setVisible(false);
      this.s2s2RequestHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("N3", "=HANDS(DEPARTMENT_PATCH)");
      return;
    }
    if (distanceTo(this.s2s2Outbox) < 110 && this.s2s2RequestCarrying) {
      this.s2s2RequestCarrying = false;
      this.s2s2RequestSubmitted = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true });
      useGameStore.getState().setSelectedCell("P9", "=OUTBOX.SUBMIT(DEPARTMENT_PATCH)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("Q9", "=SHEET.PASS(2,2)");
    }
  }

  private updateSession2Sheet3Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s2s3TrainingTerminal) < 105) {
      this.prompt.setText(this.s2s3FilterUnlocked
        ? "D8 FILTER 교육 완료"
        : "E · D8 FILTER 교육 활성화");
    } else if (distanceTo(this.s2s3RechargeNode) < 92) {
      this.prompt.setText(this.rechargeUsed ? "D2 충전 노드 사용 완료" : "E · D2 CALC +2 충전");
    } else if (distanceTo(this.s2s3FilterStation) < 115) {
      this.prompt.setText(this.s2s3FilterActive
        ? `FILTER 유지 ${Math.max(0, Math.ceil((this.s2s3FilterUntil - this.time.now) / 1000))}초`
        : this.s2s3FilterUnlocked
          ? "SPACE · F3:J6 CLEARANCE FILTER"
          : "먼저 D8 FILTER 교육을 활성화");
    } else if (distanceTo(this.s2s3Patch) < 100 && this.s2s3Patch?.visible) {
      this.prompt.setText(this.terminalChecked ? "E · O3 CLEARANCE_PATCH 회수" : "K5 검문소 FILTER 통과 필요");
    } else if (distanceTo(this.s2s3Outbox) < 110) {
      this.prompt.setText(this.s2s3PatchSubmitted
        ? "Q9 OUTBOX 제출 완료"
        : this.s2s3PatchCarrying
          ? "E · Q9 CLEARANCE_PATCH 제출"
          : "O3 패치를 먼저 회수");
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · R9 EXIT" : "Q9 OUTBOX 제출 필요");
    } else {
      this.prompt.setText("D8 교육 → F3:J6 FILTER → K5 통과 → O3 PATCH → Q9 OUTBOX");
    }
  }

  private interactSession2Sheet3() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s2s3TrainingTerminal) < 105 && !this.s2s3FilterUnlocked) {
      this.s2s3FilterUnlocked = true;
      this.s2s3TrainingTerminal?.setTint(0x79d6a5);
      useGameStore.getState().setSelectedCell("D8", "=TRAINING.UNLOCK(FILTER)");
      return;
    }
    if (distanceTo(this.s2s3RechargeNode) < 92 && !this.rechargeUsed) {
      this.rechargeUsed = true;
      this.calc = Math.min(7, this.calc + 2);
      this.s2s3RechargeNode?.setTint(0x79d6a5);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("D2", "=CALC.RECHARGE(+2)");
      return;
    }
    if (
      distanceTo(this.s2s3Patch) < 100
      && this.s2s3Patch?.visible
      && this.terminalChecked
    ) {
      this.s2s3PatchCarrying = true;
      this.s2s3Patch.setVisible(false);
      this.s2s3PatchHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("O3", "=HANDS(CLEARANCE_PATCH)");
      return;
    }
    if (distanceTo(this.s2s3Outbox) < 110 && this.s2s3PatchCarrying) {
      this.s2s3PatchCarrying = false;
      this.s2s3PatchSubmitted = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true });
      useGameStore.getState().setSelectedCell("Q9", "=OUTBOX.SUBMIT(CLEARANCE_PATCH)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("R9", "=SHEET.PASS(2,3)");
    }
  }

  private updateSession2Sheet4Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    const writeRemaining = Math.max(
      0,
      Math.ceil((this.s2s4WriteUntil - this.time.now) / 1000),
    );
    if (distanceTo(this.s2s4DispatchTerminal) < 105) {
      this.prompt.setText(
        this.s2s4Sorted
          ? "E8 HR DISPATCH 연결 완료"
          : this.s2s4WriteUnlocked
            ? `WRITE ACCESS ${writeRemaining}초 · F열 편집 가능`
            : "E · E8 HR DISPATCH 연결 (20초 쓰기 권한)",
      );
    } else if (distanceTo(this.s2s4WriteConsole) < 115) {
      this.prompt.setText(
        !this.s2s4WriteUnlocked
          ? "F열 잠김 · E8 단말기를 먼저 연결"
          : !this.s2s4Filtered
            ? "SPACE · TASK_QUEUE FILTER (ROLE=TEAM_LEADER)"
            : !this.s2s4Sorted
              ? "SPACE · TASK_QUEUE SORT (PRIORITY ASC)"
              : "QUEUE 편집 완료 · M3 팀장 처리 대기",
      );
    } else if (distanceTo(this.s2s4ProcessMarker) < 100) {
      this.prompt.setText(
        this.s2s4Processed
          ? "P3 DEPARTMENT_FIX 처리 완료 · 위반 2"
          : this.s2s4Dispatched
            ? "M3 보안팀장 P3 처리 중…"
            : this.s2s4Sorted
              ? "정렬 완료 · 팀장 배치 대기"
              : "P3 잠김 · FILTER 후 SORT 필요",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · R10 EXIT" : "EXIT 잠김 · K5 검문소 개방 필요");
    } else {
      this.prompt.setText("E8 연결 → FILTER → SORT → 팀장 P3 처리 → R10");
    }
  }

  private interactSession2Sheet4() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (
      distanceTo(this.s2s4DispatchTerminal) < 105
      && !this.s2s4WriteUnlocked
      && !this.s2s4Sorted
    ) {
      this.s2s4WriteUnlocked = true;
      this.s2s4WriteUntil = this.time.now + 20000;
      this.s2s4DispatchHighlight?.clearTint().setTint(0x79d6a5);
      useGameStore.getState().setSelectedCell("E8", "=CONNECT(HR_DISPATCH) // WRITE 20s");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("R10", "=SHEET.PASS(2,4)");
    }
  }

  private updateSession2FinalPrompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    const windowRemaining = Math.max(
      0,
      Math.ceil((this.s2fSampleUntil - this.time.now) / 1000),
    );
    if (distanceTo(this.s2fRechargeNode) < 92) {
      this.prompt.setText(this.rechargeUsed ? "D2 충전 노드 사용 완료" : "E · D2 CALC +2 충전");
    } else if (distanceTo(this.s2fAuditStation) < 115) {
      this.prompt.setText(
        !this.s2fFiltered
          ? "SPACE · AUDIT_ROWS FILTER (DATE=TODAY)"
          : !this.s2fSorted
            ? `SPACE · AUDIT_ROWS SORT (STATUS ASC) · ${windowRemaining}초`
            : this.s2fSampleValid
              ? `표본 유효 · Q3 제출까지 ${windowRemaining}초`
              : "표본 재구성 필요 · 최소 5행 COMPLIANT",
      );
    } else if (distanceTo(this.s2fSubmitTerminal) < 110) {
      this.prompt.setText(
        this.s2fSubmitted
          ? "Q3 COMPLIANT 판정 저장 완료"
          : this.s2fSampleValid
            ? `E · Q3 감사 표본 제출 (${windowRemaining}초)`
            : "Q3 잠김 · FILTER 후 SORT로 표본 구성",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · R10 EXIT" : "EXIT 잠김 · Q3 제출 필요");
    } else {
      this.prompt.setText("D2 충전 → FILTER → SORT → Q3 제출 → R10 · CHIEF 순환 주의");
    }
  }

  private interactSession2Final() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s2fRechargeNode) < 92 && !this.rechargeUsed) {
      this.rechargeUsed = true;
      this.calc = Math.min(7, this.calc + 2);
      this.s2fRechargeNode?.setTint(0x79d6a5);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("D2", "=CALC.RECHARGE(+2)");
      return;
    }
    if (
      distanceTo(this.s2fSubmitTerminal) < 110
      && this.s2fSampleValid
      && !this.s2fSubmitted
    ) {
      this.s2fSubmitted = true;
      this.exitUnlocked = true;
      this.terminalChecked = true;
      this.s2fSubmitHighlight?.setTint(0x79d6a5);
      this.s2fGate?.setTexture("office-ref-exitOpen");
      const gateBody = this.s2fGateBody ? this.arcadeBody(this.s2fGateBody) : undefined;
      if (gateBody) gateBody.enable = false;
      this.exitDoor.setTexture("office-ref-exitOpen");
      this.s2fVerdictLabel
        ?.setText("ACCESS_VERDICT = COMPLIANT · SAMPLE VIOLATION 0")
        .setColor("#bfe6c4");
      useGameStore.getState().updateKeeper({ exitUnlocked: true, terminalChecked: true });
      useGameStore.getState().setSelectedCell("Q3", "=SAVE(ACCESS_VERDICT=COMPLIANT)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("R10", "=SHEET.PASS(2,5)");
    }
  }

  private updateSession3Sheet1Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s3s1IfTerminal) < 105) {
      this.prompt.setText(this.s3s1IfUnlocked ? "D7 IF 교육 완료" : "E · D7 IF 교육 활성화");
    } else if (distanceTo(this.s3s1InstallConsole) < 115) {
      this.prompt.setText(
        !this.s3s1IfUnlocked
          ? "H7 잠김 · D7 교육 단말기를 먼저 확인"
          : this.s3s1IfInstalled
            ? "IF 설치됨 · H7 커피 호출로 조건 발동"
            : "SPACE · H7 IF(EMPLOYEE_A.IN(G4),DOOR_K5.OPEN) 설치",
      );
    } else if (distanceTo(this.s3s1CoffeeButton) < 100) {
      this.prompt.setText(
        !this.s3s1IfInstalled
          ? "H7 IF를 먼저 설치"
          : this.s3s1CoffeeCalled
            ? (this.s3s1Triggered ? "K5 문 개방 · IF CONSUMED" : "EMPLOYEE_A 이동 중…")
            : "E · 커피 호출 (COFFEE_PICKUP 생성)",
      );
    } else if (distanceTo(this.s3s1Log) < 100 && this.s3s1Log?.visible) {
      this.prompt.setText(this.s3s1Triggered ? "E · N3 AUTOMATION_LOG 회수" : "K5 문 개방 후 접근 가능");
    } else if (distanceTo(this.s3s1Outbox) < 110) {
      this.prompt.setText(
        this.s3s1LogSubmitted
          ? "O8 OUTBOX 제출 완료"
          : this.s3s1LogCarrying
            ? "E · O8 AUTOMATION_LOG 제출"
            : "N3 로그를 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · P8 EXIT" : "EXIT 잠김 · O8 제출 필요");
    } else {
      this.prompt.setText("D7 교육 → H7 IF 설치 → 커피 호출 → N3 로그 → O8 제출 → P8");
    }
  }

  private interactSession3Sheet1() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s3s1IfTerminal) < 105 && !this.s3s1IfUnlocked) {
      this.s3s1IfUnlocked = true;
      this.s3s1IfHighlight?.setTint(0x79d6a5);
      useGameStore.getState().setSelectedCell("D7", "=TRAINING.UNLOCK(IF)");
      return;
    }
    if (
      distanceTo(this.s3s1CoffeeButton) < 100
      && this.s3s1IfInstalled
      && !this.s3s1CoffeeCalled
    ) {
      this.s3s1CoffeeCalled = true;
      this.s3s1CoffeeHighlight?.setTint(0x79d6a5);
      useGameStore.getState().setSelectedCell("H7", "=CALL(EMPLOYEE_A, COFFEE_PICKUP)");
      this.tweens.add({
        targets: this.s3s1Employee,
        x: 700,
        y: 200,
        duration: 1600,
        ease: "Sine.InOut",
        onComplete: () => this.triggerSession3Sheet1If(),
      });
      return;
    }
    if (distanceTo(this.s3s1Log) < 100 && this.s3s1Log?.visible && this.s3s1Triggered) {
      this.s3s1LogCarrying = true;
      this.s3s1Log.setVisible(false);
      this.s3s1LogHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("N3", "=HANDS(AUTOMATION_LOG)");
      return;
    }
    if (distanceTo(this.s3s1Outbox) < 110 && this.s3s1LogCarrying) {
      this.s3s1LogCarrying = false;
      this.s3s1LogSubmitted = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true });
      useGameStore.getState().setSelectedCell("O8", "=OUTBOX.SUBMIT(AUTOMATION_LOG)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("P8", "=SHEET.PASS(3,1)");
    }
  }

  private triggerSession3Sheet1If() {
    if (this.s3s1Triggered) return;
    this.s3s1Triggered = true;
    this.terminalChecked = true;
    this.s3s1Door?.setTexture("office-ref-exitOpen");
    const doorBody = this.s3s1DoorBody ? this.arcadeBody(this.s3s1DoorBody) : undefined;
    if (doorBody) doorBody.enable = false;
    this.s3s1ConditionCell?.setFillStyle(0x8fe0a4, 0.24).setStrokeStyle(2, 0x4fb877, 0.9);
    this.s3s1TriggerLine?.setStrokeStyle(3, 0x6fe08c, 0.95);
    this.s3s1ResultLine?.setStrokeStyle(3, 0x6fe08c, 0.95);
    this.s3s1StatusLabel?.setText("IF CONSUMED · RESULT=TRUE · K5 OPEN").setColor("#bfe6c4");
    useGameStore.getState().updateKeeper({ terminalChecked: true });
    useGameStore.getState().setSelectedCell("K5", "=IF(EMPLOYEE_A.IN(G4),DOOR_K5.OPEN) // TRUE");
  }

  private updateSession3Sheet2Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s3s2ConsoleA) < 115) {
      this.prompt.setText(
        this.s3s2If1Installed
          ? "IF#1 CONSUMED · H5 개방됨"
          : "SPACE · F7 IF(PRINTER=JAMMED,H5.OPEN) 즉시 설치",
      );
    } else if (distanceTo(this.s3s2RechargeNode) < 92) {
      this.prompt.setText(this.rechargeUsed ? "I7 충전 노드 사용 완료" : "E · I7 CALC +2 충전");
    } else if (distanceTo(this.s3s2ConsoleB) < 115) {
      this.prompt.setText(
        this.s3s2If2Installed
          ? "IF#2 설치됨 · J8 수리 호출로 발동"
          : this.calc < 3
            ? "CALC 부족 · I7 충전 노드 필요"
            : "SPACE · L7 IF(FACILITIES.IN(L4),N5.OPEN) 설치",
      );
    } else if (distanceTo(this.s3s2RepairButton) < 100) {
      this.prompt.setText(
        !this.s3s2If2Installed
          ? "IF#2를 먼저 설치"
          : this.s3s2RepairCalled
            ? (this.s3s2Triggered ? "N5 개방 · IF#2 CONSUMED" : "FACILITIES_A 이동 중…")
            : "E · J8 수리 호출 (REPAIR_REQUEST)",
      );
    } else if (distanceTo(this.s3s2Template) < 100 && this.s3s2Template?.visible) {
      this.prompt.setText(this.s3s2Triggered ? "E · P3 ACTION_TEMPLATE 회수" : "N5 개방 후 접근 가능");
    } else if (distanceTo(this.s3s2Outbox) < 110) {
      this.prompt.setText(
        this.s3s2TemplateSubmitted
          ? "Q9 OUTBOX 제출 완료"
          : this.s3s2TemplateCarrying
            ? "E · Q9 ACTION_TEMPLATE 제출"
            : "P3 템플릿을 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · R9 EXIT" : "EXIT 잠김 · Q9 제출 필요");
    } else {
      this.prompt.setText("IF#1 즉시 → H5 → I7 충전 → IF#2 → 수리 호출 → N5 → Q9 → R9");
    }
  }

  private interactSession3Sheet2() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s3s2RechargeNode) < 92 && !this.rechargeUsed) {
      this.rechargeUsed = true;
      this.calc = Math.min(7, this.calc + 2);
      this.s3s2RechargeNode?.setTint(0x79d6a5);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("I7", "=CALC.RECHARGE(+2)");
      return;
    }
    if (
      distanceTo(this.s3s2RepairButton) < 100
      && this.s3s2If2Installed
      && !this.s3s2RepairCalled
    ) {
      this.s3s2RepairCalled = true;
      this.s3s2RepairHighlight?.setTint(0x79d6a5);
      useGameStore.getState().setSelectedCell("J8", "=CALL(FACILITIES_A, REPAIR_REQUEST)");
      this.tweens.add({
        targets: this.s3s2Worker,
        x: 1000,
        y: 220,
        duration: 1600,
        ease: "Sine.InOut",
        onComplete: () => this.triggerSession3Sheet2If2(),
      });
      return;
    }
    if (distanceTo(this.s3s2Template) < 100 && this.s3s2Template?.visible && this.s3s2Triggered) {
      this.s3s2TemplateCarrying = true;
      this.s3s2Template.setVisible(false);
      this.s3s2TemplateHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("P3", "=HANDS(ACTION_TEMPLATE)");
      return;
    }
    if (distanceTo(this.s3s2Outbox) < 110 && this.s3s2TemplateCarrying) {
      this.s3s2TemplateCarrying = false;
      this.s3s2TemplateSubmitted = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true });
      useGameStore.getState().setSelectedCell("Q9", "=OUTBOX.SUBMIT(ACTION_TEMPLATE)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("R9", "=SHEET.PASS(3,2)");
    }
  }

  private triggerSession3Sheet2If2() {
    if (this.s3s2Triggered) return;
    this.s3s2Triggered = true;
    this.terminalChecked = true;
    this.s3s2Door2?.setTexture("office-ref-exitOpen");
    const doorBody = this.s3s2Door2Body ? this.arcadeBody(this.s3s2Door2Body) : undefined;
    if (doorBody) doorBody.enable = false;
    this.s3s2ConditionCell?.setFillStyle(0x8fe0a4, 0.24).setStrokeStyle(2, 0x4fb877, 0.9);
    this.s3s2ResultLine?.setStrokeStyle(3, 0x6fe08c, 0.95);
    this.s3s2StatusLabel?.setText("IF#1 CONSUMED · IF#2 CONSUMED · N5 OPEN").setColor("#bfe6c4");
    useGameStore.getState().updateKeeper({ terminalChecked: true });
    useGameStore.getState().setSelectedCell("N5", "=IF(FACILITIES_A.IN(L4),DOOR_N5.OPEN) // TRUE");
  }

  private updateSession3Sheet3Prompt() {
    if (!this.player || !this.prompt || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    const doorRemaining = Math.max(
      0,
      Math.ceil((this.s3s3DoorOpenUntil - this.time.now) / 1000),
    );
    if (distanceTo(this.s3s3IfConsole) < 115) {
      this.prompt.setText(
        this.s3s3IfInstalled
          ? "IF 설치됨 · 컨베이어 가동 중 · SPACE로 ROW_4 HIDE"
          : "SPACE · G7 IF(DOCUMENT.IN(J4),L5.OPEN_FOR(3)) 설치",
      );
    } else if (distanceTo(this.s3s3Door) < 120) {
      this.prompt.setText(
        this.s3s3Passed
          ? "L5 통과 완료"
          : this.s3s3DoorOpenUntil > 0
            ? `L5 개방 ${doorRemaining}초 · 지금 통과`
            : "L5 닫힘 · 문서가 J4에 도달해야 개방",
      );
    } else if (distanceTo(this.s3s3Template) < 100 && this.s3s3Template?.visible) {
      this.prompt.setText(this.s3s3Passed ? "E · N3 TRIGGER_TEMPLATE 회수" : "L5 통과 후 접근 가능");
    } else if (distanceTo(this.s3s3Outbox) < 110) {
      this.prompt.setText(
        this.s3s3TemplateSubmitted
          ? "P9 OUTBOX 제출 완료"
          : this.s3s3TemplateCarrying
            ? "E · P9 TRIGGER_TEMPLATE 제출"
            : "N3 템플릿을 먼저 회수",
      );
    } else if (distanceTo(this.exitDoor) < 120) {
      this.prompt.setText(this.exitUnlocked ? "E · Q9 EXIT" : "EXIT 잠김 · P9 제출 필요");
    } else if (this.s3s3IfInstalled && !this.s3s3Passed) {
      this.prompt.setText("문서 H4 도착 시 SPACE로 ROW_4 HIDE → 5초 정지 · 문 앞 대기");
    } else {
      this.prompt.setText("G7 IF 설치 → ROW_4 HIDE로 정지 → L5 첫 개방 통과 → N3 → P9 → Q9");
    }
  }

  private interactSession3Sheet3() {
    if (!this.player || !this.exitDoor) return;
    const distanceTo = (object?: Phaser.GameObjects.Image) => object
      ? Phaser.Math.Distance.BetweenPoints(this.player!, object)
      : Number.POSITIVE_INFINITY;
    if (distanceTo(this.s3s3Template) < 100 && this.s3s3Template?.visible && this.s3s3Passed) {
      this.s3s3TemplateCarrying = true;
      this.s3s3Template.setVisible(false);
      this.s3s3TemplateHighlight?.setVisible(false);
      useGameStore.getState().setSelectedCell("N3", "=HANDS(TRIGGER_TEMPLATE)");
      return;
    }
    if (distanceTo(this.s3s3Outbox) < 110 && this.s3s3TemplateCarrying) {
      this.s3s3TemplateCarrying = false;
      this.s3s3TemplateSubmitted = true;
      this.exitUnlocked = true;
      this.terminalHighlight?.setTint(0x79d6a5);
      this.exitDoor.setTexture("office-ref-exitOpen");
      useGameStore.getState().updateKeeper({ exitUnlocked: true });
      useGameStore.getState().setSelectedCell("P9", "=OUTBOX.SUBMIT(TRIGGER_TEMPLATE)");
      return;
    }
    if (distanceTo(this.exitDoor) < 120 && this.exitUnlocked) {
      this.runStatus = "won";
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0);
      useGameStore.getState().updateKeeper({ status: "won" });
      useGameStore.getState().setSelectedCell("Q9", "=SHEET.PASS(3,3)");
    }
  }

  private copyContextObject() {
    if (this.isSession1Sheet3()) this.copySheet3Badge();
    if (this.isSession1Sheet4()) this.copySheet4Object();
    if (this.isSession1Final()) this.copyFinalProjectBonus();
  }

  private pasteContextObject() {
    if (this.isSession1Sheet3()) this.pasteSheet3Badge();
    if (this.isSession1Sheet4()) this.pasteSheet4Object();
    if (this.isSession1Final()) this.pasteFinalProjectBonus();
  }

  private copySheet3Badge() {
    if (!this.isSession1Sheet3() || !this.player || !this.sheet3LeaderBadge) return;
    if (!this.copyPasteUnlocked || this.leaderBadgeCopied) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.sheet3LeaderBadge) >= 320) return;
    this.leaderBadgeCopied = true;
    this.sheet3BadgeHighlight?.setTint(0x79d6a5);
    useGameStore.getState().setSelectedCell("H3", "=COPY(TEAM_LEADER_BADGE)");
  }

  private pasteSheet3Badge() {
    if (!this.isSession1Sheet3() || !this.player || !this.sheet3PasteStation) return;
    if (!this.copyPasteUnlocked || !this.leaderBadgeCopied || this.duplicateBadgeEquipped) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.sheet3PasteStation) >= 105) return;
    this.duplicateBadgeEquipped = true;
    this.originalBadgeRestored = false;
    this.sheet3PasteStation.setTint(0x79d6a5);
    this.sheet3SecurityDoor?.setTexture("office-ref-exitOpen");
    const doorBody = this.arcadeBody(this.sheet3SecurityDoorBody!);
    if (doorBody) doorBody.enable = false;
    useGameStore.getState().updateKeeper({ terminalChecked: true });
    useGameStore.getState().setSelectedCell("G8", "=PASTE(TEAM_LEADER_BADGE_DUPLICATE)");
  }

  private copySheet4Object() {
    if (!this.isSession1Sheet4() || !this.player) return;
    const printerDistance = this.sheet4Printer
      ? Phaser.Math.Distance.BetweenPoints(this.player, this.sheet4Printer)
      : Number.POSITIVE_INFINITY;
    const cabinetDistance = this.sheet4Cabinet
      ? Phaser.Math.Distance.BetweenPoints(this.player, this.sheet4Cabinet)
      : Number.POSITIVE_INFINITY;
    if (printerDistance < 105 && !this.sheet4PrinterDuplicated) {
      this.sheet4Clipboard = "printer";
      this.sheet4Printer?.setTint(0x9bd6ad);
      useGameStore.getState().setSelectedCell("G8", "=COPY(BROKEN_PRINTER)");
    } else if (cabinetDistance < 105 && !this.sheet4CabinetDuplicated) {
      this.sheet4Clipboard = "cabinet";
      this.sheet4Cabinet?.setTint(0x9bbfd6);
      useGameStore.getState().setSelectedCell("E7", "=COPY(MOBILE_CABINET)");
    }
  }

  private pasteSheet4Object() {
    if (!this.isSession1Sheet4() || !this.player) return;
    const printerTargetDistance = this.sheet4PrinterTarget
      ? Phaser.Math.Distance.BetweenPoints(this.player, this.sheet4PrinterTarget)
      : Number.POSITIVE_INFINITY;
    const cabinetTargetDistance = this.sheet4CabinetTarget
      ? Phaser.Math.Distance.BetweenPoints(this.player, this.sheet4CabinetTarget)
      : Number.POSITIVE_INFINITY;
    if (
      this.sheet4Clipboard === "printer" &&
      !this.sheet4PrinterDuplicated &&
      printerTargetDistance < 115
    ) {
      this.sheet4PrinterDuplicated = true;
      this.sheet4Clipboard = null;
      this.sheet4PrinterTarget?.setVisible(false);
      this.add.image(1000, 390, "office-ref-copier")
        .setDisplaySize(70, 88).setTint(0x9bd6ad).setDepth(8);
      useGameStore.getState().setSelectedCell("M8", "=PASTE(BROKEN_PRINTER) // FACILITIES");
      this.dispatchSheet4Facilities();
      return;
    }
    if (
      this.sheet4Clipboard === "cabinet" &&
      !this.sheet4CabinetDuplicated &&
      cabinetTargetDistance < 270
    ) {
      this.sheet4CabinetDuplicated = true;
      this.sheet4Clipboard = null;
      this.sheet4CabinetTarget?.setVisible(false);
      this.add.image(840, 182, "office-ref-filingCabinet")
        .setDisplaySize(66, 74).setTint(0x9bbfd6).setDepth(8);
      this.disableSheet4Cctv();
      useGameStore.getState().setSelectedCell("K4", "=PASTE(MOBILE_CABINET) // CCTV BLOCKED");
    }
  }

  private dispatchSheet4Facilities() {
    const destinations = [
      { x: 820, y: 390 },
      { x: 900, y: 390 },
    ];
    this.sheet4Facilities.forEach((worker, index) => {
      this.tweens.add({
        targets: worker,
        x: destinations[index].x,
        y: destinations[index].y,
        duration: 1500 + index * 180,
        ease: "Sine.InOut",
      });
    });
    this.time.delayedCall(1900, () => this.openSheet4AdminDoor("FACILITIES_TASK"));
  }

  private disableSheet4Cctv() {
    this.sheet4CctvDisabled = true;
    for (const cctv of this.sheet4Cctvs) cctv.setTint(0x70867f).setAlpha(0.46);
  }

  private openSheet4AdminDoor(reason: "EMERGENCY_RELEASE" | "FACILITIES_TASK") {
    if (this.sheet4AdminDoorOpen) return;
    this.sheet4AdminDoorOpen = true;
    this.sheet4AdminDoor?.setTexture("office-ref-exitOpen");
    const body = this.sheet4AdminDoorBody ? this.arcadeBody(this.sheet4AdminDoorBody) : undefined;
    if (body) body.enable = false;
    this.sheet4EmergencyRelease?.setTint(0x79d6a5);
    useGameStore.getState().setSelectedCell(
      "L6",
      `=DOOR.OPEN(${reason})`,
    );
  }

  private copyFinalProjectBonus() {
    if (!this.isSession1Final() || !this.player || !this.finalProjectBonus) return;
    if (this.finalBonusCopied || this.time.now < this.finalBonusLockedUntil) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.finalProjectBonus) >= 110) return;
    this.finalBonusCopied = true;
    this.finalProjectHighlight?.setTint(0x79d6a5);
    useGameStore.getState().setSelectedCell("F3", "=COPY(PROJECT_BONUS,+18)");
  }

  private pasteFinalProjectBonus() {
    if (!this.isSession1Final() || !this.player || !this.finalBorrowTarget) return;
    if (!this.finalBonusCopied || this.finalBonusPasted) return;
    if (this.time.now < this.finalBonusLockedUntil) return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.finalBorrowTarget) >= 115) return;
    this.finalBonusPasted = true;
    this.finalBorrowTarget.setVisible(false);
    this.finalBorrowedResult = this.add.image(1160, 286, "office-ref-approvalDocument")
      .setDisplaySize(46, 54).setTint(0x79d6a5).setDepth(10);
    useGameStore.getState().setSelectedCell("O6", "=PASTE(PROJECT_BONUS,+18)");
    this.updateFinalScoreDisplay();
  }

  private currentFinalScore() {
    const penaltyHidden = this.hideUntil > this.time.now
      && this.activeHideTargets.some((target) => target.targetKey === "ROW_5");
    return 42 + (penaltyHidden ? 15 : 0) + (this.finalBonusPasted ? 18 : 0) - this.finalWorkPenalty;
  }

  private updateFinalScoreDisplay() {
    if (!this.finalScoreLabel) return;
    if (this.terminalChecked) {
      this.finalScoreLabel.setText("STORED SCORE 75+ · PASS").setColor("#28734f");
      return;
    }
    const score = this.currentFinalScore();
    this.finalScoreLabel
      .setText(`EVALUATION ${score} / 70`)
      .setColor(score >= 70 ? "#28734f" : "#8b4a42");
  }

  private setEditMode(active: boolean) {
    if (active && this.isSession2Sheet1()) {
      if (
        !this.player ||
        !this.s2s1SortStation ||
        !this.s2s1SortUnlocked ||
        this.s2s1QueueValid ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s2s1SortStation) >= 115
      ) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.formulaTitle?.setText("CELL EDIT MODE · SORT RANGE");
      this.previewArmed = false;
      this.s2s1SortPreviewed = false;
      this.formulaLabel?.setText("fx  =SORT(F3:J3, RANK, ASC)");
      this.inspectionLabel
        ?.setText("F3:J3 · ROWS 5 · STABLE ORDER REQUIRED")
        .setColor("#a9c7bd");
      this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 1\nSPACE 편집 취소");
      useGameStore.getState().setSelectedCell("F7", "=SORT(F3:J3,RANK,ASC)");
      return;
    }
    if (active && this.isSession2Sheet2()) {
      if (
        !this.player ||
        !this.s2s2SortStation ||
        this.s2s2QueueValid ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s2s2SortStation) >= 115
      ) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.formulaTitle?.setText("CELL EDIT MODE · DEPARTMENT SORT");
      this.previewArmed = false;
      this.s2s2SortPreviewed = false;
      this.formulaLabel?.setText("fx  =SORT(F3:H4, DEPARTMENT_CODE, ASC)");
      this.inspectionLabel
        ?.setText("F3:H4 · ROWS 6 · HR + SECURITY STABLE ORDER")
        .setColor("#a9c7bd");
      this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 1\nSPACE 편집 취소");
      useGameStore.getState().setSelectedCell("E7", "=SORT(F3:H4,DEPARTMENT_CODE,ASC)");
      return;
    }
    if (active && this.isSession2Sheet3()) {
      if (
        !this.player ||
        !this.s2s3FilterStation ||
        !this.s2s3FilterUnlocked ||
        this.s2s3FilterActive ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s2s3FilterStation) >= 115
      ) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.formulaTitle?.setText("CELL EDIT MODE · CLEARANCE FILTER");
      this.previewArmed = false;
      this.s2s3FilterPreviewed = false;
      this.formulaLabel?.setText("fx  =FILTER(F3:J6, CLEARANCE>=2)");
      this.inspectionLabel
        ?.setText("F3:J6 · KEEP CLEARANCE 2+ · DYNAMIC RANGE")
        .setColor("#a9c7bd");
      this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 1\n8초 유지 · 새 행 자동 재평가 · SPACE 취소");
      useGameStore.getState().setSelectedCell("H7", "=FILTER(F3:J6,CLEARANCE>=2)");
      return;
    }
    if (active && this.isSession2Sheet4()) {
      if (
        !this.player ||
        !this.s2s4WriteConsole ||
        !this.s2s4WriteUnlocked ||
        this.s2s4Sorted ||
        this.time.now >= this.s2s4WriteUntil ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s2s4WriteConsole) >= 115
      ) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      if (!this.s2s4Filtered) {
        this.formulaTitle?.setText("CELL EDIT MODE · QUEUE FILTER");
        this.s2s4FilterPreviewed = false;
        this.formulaLabel?.setText('fx  =FILTER(TASK_QUEUE, ROLE="TEAM_LEADER")');
        this.inspectionLabel
          ?.setText("F3:H6 · KEEP TEAM_LEADER · DROP FACILITIES")
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\nSPACE 편집 취소");
        useGameStore.getState().setSelectedCell("F7", '=FILTER(TASK_QUEUE,ROLE="TEAM_LEADER")');
      } else {
        this.formulaTitle?.setText("CELL EDIT MODE · PRIORITY SORT");
        this.s2s4SortPreviewed = false;
        this.formulaLabel?.setText("fx  =SORT(TASK_QUEUE, PRIORITY, ASC)");
        this.inspectionLabel
          ?.setText("F3:H5 · LOW PRIORITY FIRST · STABLE ORDER")
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 2\nSPACE 편집 취소");
        useGameStore.getState().setSelectedCell("G7", "=SORT(TASK_QUEUE,PRIORITY,ASC)");
      }
      return;
    }
    if (active && this.isSession2Final()) {
      if (
        !this.player ||
        !this.s2fAuditStation ||
        this.s2fSorted ||
        this.s2fSubmitted ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s2fAuditStation) >= 115
      ) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      if (!this.s2fFiltered) {
        this.formulaTitle?.setText("CELL EDIT MODE · AUDIT FILTER");
        this.s2fFilterPreviewed = false;
        this.formulaLabel?.setText('fx  =FILTER(AUDIT_ROWS, DATE="TODAY")');
        this.inspectionLabel
          ?.setText("L2:P7 · DROP YESTERDAY · KEEP 6 ROWS")
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\n8초 창 시작 · SPACE 편집 취소");
        useGameStore.getState().setSelectedCell("M7", '=FILTER(AUDIT_ROWS,DATE="TODAY")');
      } else {
        this.formulaTitle?.setText("CELL EDIT MODE · SAMPLE SORT");
        this.s2fSortPreviewed = false;
        this.formulaLabel?.setText("fx  =SORT(AUDIT_ROWS, STATUS, ASC)");
        this.inspectionLabel
          ?.setText("COMPLIANT FIRST · PLAYER VIOLATION #6")
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 2\nSPACE 편집 취소");
        useGameStore.getState().setSelectedCell("M7", "=SORT(AUDIT_ROWS,STATUS,ASC)");
      }
      return;
    }
    if (active && this.isSession3Sheet1()) {
      if (
        !this.player ||
        !this.s3s1InstallConsole ||
        !this.s3s1IfUnlocked ||
        this.s3s1IfInstalled ||
        Phaser.Math.Distance.BetweenPoints(this.player, this.s3s1InstallConsole) >= 115
      ) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      this.s3s1IfPreviewed = false;
      this.formulaTitle?.setText("CELL EDIT MODE · INSTALL IF");
      this.formulaLabel?.setText("fx  =IF(EMPLOYEE_A.IN(G4), DOOR_K5.OPEN)");
      this.inspectionLabel
        ?.setText("H7 · CURRENT RESULT=FALSE / WAITING")
        .setColor("#a9c7bd");
      this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 1\nFALSE 상태로 설치 · SPACE 취소");
      useGameStore.getState().setSelectedCell("H7", "=IF(EMPLOYEE_A.IN(G4),DOOR_K5.OPEN)");
      return;
    }
    if (active && this.isSession3Sheet2()) {
      const nearA = !!this.s3s2ConsoleA
        && !this.s3s2If1Installed
        && Phaser.Math.Distance.BetweenPoints(this.player!, this.s3s2ConsoleA) < 115;
      const nearB = !!this.s3s2ConsoleB
        && this.s3s2If1Installed
        && !this.s3s2If2Installed
        && Phaser.Math.Distance.BetweenPoints(this.player!, this.s3s2ConsoleB) < 115;
      if (!this.player || (!nearA && !nearB)) return;
      this.editMode = true;
      this.formulaPanel?.setVisible(true);
      this.columnSelection?.setVisible(false);
      this.previewArmed = false;
      if (nearA) {
        this.s3s2If1Previewed = false;
        this.formulaTitle?.setText("CELL EDIT MODE · INSTALL IF (IMMEDIATE)");
        this.formulaLabel?.setText('fx  =IF(PRINTER_F4.STATUS="JAMMED", DOOR_H5.OPEN)');
        this.inspectionLabel
          ?.setText("F7 · PRINTER_F4=JAMMED · RESULT=TRUE / EXECUTE NOW")
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\n즉시 H5 개방 · SPACE 취소");
        useGameStore.getState().setSelectedCell("F7", '=IF(PRINTER_F4.STATUS="JAMMED",DOOR_H5.OPEN)');
      } else {
        this.s3s2If2Previewed = false;
        this.formulaTitle?.setText("CELL EDIT MODE · INSTALL IF (DELAYED)");
        this.formulaLabel?.setText("fx  =IF(FACILITIES_A.IN(L4), DOOR_N5.OPEN)");
        this.inspectionLabel
          ?.setText("L7 · FACILITIES_A @ K3 · RESULT=FALSE / WAITING")
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\n수리 호출로 발동 · SPACE 취소");
        useGameStore.getState().setSelectedCell("L7", "=IF(FACILITIES_A.IN(L4),DOOR_N5.OPEN)");
      }
      return;
    }
    if (active && this.isSession3Sheet3()) {
      const nearConsole = !!this.s3s3IfConsole
        && !this.s3s3IfInstalled
        && !!this.player
        && Phaser.Math.Distance.BetweenPoints(this.player, this.s3s3IfConsole) < 115;
      if (nearConsole) {
        this.s3s3IfEditing = true;
        this.editMode = true;
        this.formulaPanel?.setVisible(true);
        this.columnSelection?.setVisible(false);
        this.previewArmed = false;
        this.s3s3IfPreviewed = false;
        this.formulaTitle?.setText("CELL EDIT MODE · INSTALL IF (WAITING)");
        this.formulaLabel?.setText("fx  =IF(DOCUMENT.IN(J4), DOOR_L5.OPEN_FOR(3))");
        this.inspectionLabel
          ?.setText("G7 · DOCUMENT @ F4 · RESULT=FALSE / WAITING")
          .setColor("#a9c7bd");
        this.executeLabel?.setText("ENTER 미리보기 · ENTER 실행 · CALC 3\n설치 시 컨베이어 시작 · SPACE 취소");
        useGameStore.getState().setSelectedCell("G7", "=IF(DOCUMENT.IN(J4),DOOR_L5.OPEN_FOR(3))");
        return;
      }
      // Not at the IF console: fall through to the standard ROW/COLUMN HIDE selection.
      this.s3s3IfEditing = false;
    }
    this.editMode = active;
    this.formulaPanel?.setVisible(active);
    this.columnSelection?.setVisible(active);
    this.previewArmed = false;
    if (active) {
      this.formulaTitle?.setText("CELL EDIT MODE · SELECT TARGET");
      this.selectedEditTarget = { kind: "column", index: 7 };
      this.rowInput = "";
      this.updateEditSelection();
    }
  }

  private updateEditSelection() {
    const target = this.selectedEditTarget;
    const formula = this.targetFormula(target);
    const reference = this.targetReference(target);
    const objectCount = this.targetsForSelection(target).length;
    if (target.kind === "column") {
      this.columnSelection
        ?.setPosition((target.index + 0.5) * CELL_WIDTH, WORLD_HEIGHT / 2)
        .setSize(CELL_WIDTH, WORLD_HEIGHT);
    } else {
      this.columnSelection
        ?.setPosition(WORLD_WIDTH / 2, (target.index + 0.5) * CELL_HEIGHT)
        .setSize(WORLD_WIDTH, CELL_HEIGHT);
    }
    this.formulaLabel?.setText(`fx  =HIDE(${formula})`);
    this.inspectionLabel
      ?.setText(`${reference} · OBJECTS ${objectCount} · RESULT UNKNOWN`)
      .setColor("#a9c7bd");
    this.executeLabel?.setText(
      "A–Z 열 선택 · 1–18 행 입력 · ENTER 미리보기\nSPACE 편집 취소",
    );
    useGameStore.getState().setSelectedCell(
      reference,
      `=HIDE(${formula})`,
    );
  }

  private confirmEdit(time: number) {
    if (this.isSession2Sheet1()) {
      this.confirmSession2Sheet1Sort();
      return;
    }
    if (this.isSession2Sheet2()) {
      this.confirmSession2Sheet2Sort();
      return;
    }
    if (this.isSession2Sheet3()) {
      this.confirmSession2Sheet3Filter(time);
      return;
    }
    if (this.isSession2Sheet4()) {
      this.confirmSession2Sheet4();
      return;
    }
    if (this.isSession2Final()) {
      this.confirmSession2Final();
      return;
    }
    if (this.isSession3Sheet1()) {
      this.confirmSession3Sheet1If();
      return;
    }
    if (this.isSession3Sheet2()) {
      this.confirmSession3Sheet2();
      return;
    }
    if (this.isSession3Sheet3() && this.s3s3IfEditing) {
      this.confirmSession3Sheet3If();
      return;
    }
    const target = this.selectedEditTarget;
    const targets = this.targetsForSelection(target);
    const reference = this.targetReference(target);
    if (!this.previewArmed) {
      this.previewArmed = true;
      this.inspectionLabel
        ?.setText(
          targets.length > 0
            ? `PREVIEW · ${reference}의 오브젝트 ${targets.length}개 숨김`
            : `PREVIEW · ${reference}에는 숨길 오브젝트가 없습니다`,
        )
        .setColor(targets.length > 0 ? "#f2d875" : "#e49b8f");
      this.executeLabel?.setText(
        targets.length > 0
          ? "ENTER 실행 · CALC 1 · 지속 5초\nA–Z / 1–18 대상 변경 · SPACE 취소"
          : "다른 행 또는 열을 입력하세요 · SPACE 취소",
      );
      return;
    }
    if (targets.length > 0) this.executeHide(time, target, targets);
  }

  private confirmSession2Sheet1Sort() {
    if (!this.editMode || this.s2s1QueueValid) return;
    if (!this.s2s1SortPreviewed) {
      this.s2s1SortPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · INTERN → STAFF_B → STAFF_A → TEAM_LEADER → UNKNOWN")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 1 · 동점은 기존 순서 유지\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 1) return;

    this.calc -= 1;
    const sorted = [...this.s2s1QueueEntries].sort((left, right) => {
      const leftRank = left.rank ?? Number.POSITIVE_INFINITY;
      const rightRank = right.rank ?? Number.POSITIVE_INFINITY;
      return leftRank - rightRank || left.originalIndex - right.originalIndex;
    });
    const expected = ["INTERN", "STAFF_B", "STAFF_A", "TEAM_LEADER", "UNKNOWN"];
    this.s2s1QueueValid = sorted.every((entry, index) => entry.name === expected[index]);
    sorted.forEach((entry, index) => {
      this.tweens.add({
        targets: entry.container,
        x: 440 + index * 80,
        duration: 520,
        ease: "Sine.InOut",
      });
    });
    this.s2s1QueueEntries = sorted;
    this.s2s1SortStation?.setTint(this.s2s1QueueValid ? 0x79d6a5 : 0xd97979);
    if (this.s2s1QueueValid) {
      this.s2s1Gate?.setTexture("office-ref-exitOpen");
      const gateBody = this.s2s1GateBody ? this.arcadeBody(this.s2s1GateBody) : undefined;
      if (gateBody) gateBody.enable = false;
      useGameStore.getState().updateKeeper({ calc: this.calc, terminalChecked: true });
      useGameStore.getState().setSelectedCell("F7", "=SORT(F3:J3,RANK,ASC) // QUEUE_VALID");
    }
    this.setEditMode(false);
  }

  private confirmSession2Sheet2Sort() {
    if (!this.editMode || this.s2s2QueueValid) return;
    if (!this.s2s2SortPreviewed) {
      this.s2s2SortPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · HR_A → HR_B → OPERATIONS → SECURITY_A → SECURITY_B → UNKNOWN")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · 동점 부서의 기존 순서 유지\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 1) return;

    this.calc -= 1;
    const sorted = [...this.s2s2QueueEntries].sort((left, right) => {
      const leftCode = left.departmentCode ?? Number.POSITIVE_INFINITY;
      const rightCode = right.departmentCode ?? Number.POSITIVE_INFINITY;
      return leftCode - rightCode || left.originalIndex - right.originalIndex;
    });
    const expected = ["HR_A", "HR_B", "OPERATIONS", "SECURITY_A", "SECURITY_B", "UNKNOWN"];
    this.s2s2QueueValid = sorted.every((entry, index) => entry.name === expected[index]);
    sorted.forEach((entry, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      this.tweens.add({
        targets: entry.container,
        x: 440 + column * 80,
        y: 130 + row * 52,
        duration: 560,
        ease: "Sine.InOut",
      });
    });
    this.s2s2QueueEntries = sorted;
    this.s2s2SortStation?.setTint(this.s2s2QueueValid ? 0x79d6a5 : 0xd97979);
    if (this.s2s2QueueValid) {
      this.s2s2Gate?.setTexture("office-ref-exitOpen");
      const gateBody = this.s2s2GateBody ? this.arcadeBody(this.s2s2GateBody) : undefined;
      if (gateBody) gateBody.enable = false;
      useGameStore.getState().updateKeeper({ calc: this.calc, terminalChecked: true });
      useGameStore.getState().setSelectedCell("E7", "=SORT(F3:H4,DEPARTMENT_CODE,ASC) // GROUP_VALID");
    }
    this.setEditMode(false);
  }

  private confirmSession2Sheet3Filter(time: number) {
    if (!this.editMode || this.s2s3FilterActive) return;
    if (!this.s2s3FilterPreviewed) {
      this.s2s3FilterPreviewed = true;
      this.inspectionLabel
        ?.setText("KEEP · HR_A / SECURITY_A / STAFF_B · FILTER OUT 3")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 1 · AUDIT_ESCORT 8초\n3초 뒤 LATE_STAFF 자동 재평가 · SPACE 취소");
      return;
    }
    if (this.calc < 1) return;

    this.calc -= 1;
    this.s2s3FilterActive = true;
    this.s2s3FilterUntil = time + 8000;
    this.s2s3LateStaffAt = time + 3000;
    this.s2s3LateStaffSpawned = false;
    this.s2s3QueueEntries.forEach((entry) => {
      if (!entry.qualified) entry.container.setVisible(false);
      else entry.container.setAlpha(1);
    });
    this.s2s3LateStaff?.setVisible(false);
    this.s2s3FilterStation?.setTint(0x79d6a5);
    this.s2s3Gate?.setTexture("office-ref-exitOpen");
    const gateBody = this.s2s3GateBody ? this.arcadeBody(this.s2s3GateBody) : undefined;
    if (gateBody) gateBody.enable = false;
    this.terminalChecked = true;
    useGameStore.getState().updateKeeper({ calc: this.calc, terminalChecked: true });
    useGameStore.getState().setSelectedCell(
      "K5",
      "=FILTER(F3:J6,CLEARANCE>=2) // AUDIT_ESCORT 8s",
    );
    this.setEditMode(false);
  }

  private confirmSession2Sheet4() {
    if (!this.editMode || this.s2s4Sorted) return;
    if (!this.s2s4Filtered) {
      if (!this.s2s4FilterPreviewed) {
        this.s2s4FilterPreviewed = true;
        this.inspectionLabel
          ?.setText("KEEP · BUDGET / VACATION / DEPARTMENT_FIX · DROP PRINTER_REPAIR")
          .setColor("#f2d875");
        this.executeLabel?.setText("ENTER 실행 · CALC 3 · FACILITIES 업무 제외\nSPACE 편집 취소");
        return;
      }
      if (this.calc < 3) return;

      this.calc -= 3;
      const dropped = this.s2s4QueueEntries.filter((entry) => entry.role !== "TEAM_LEADER");
      dropped.forEach((entry) => {
        this.tweens.add({
          targets: entry.container,
          alpha: 0,
          duration: 320,
          ease: "Sine.In",
          onComplete: () => entry.container.setVisible(false),
        });
      });
      this.s2s4QueueEntries = this.s2s4QueueEntries.filter((entry) => entry.role === "TEAM_LEADER");
      this.s2s4QueueEntries.forEach((entry, index) => {
        this.tweens.add({
          targets: entry.container,
          x: 420 + index * 112,
          duration: 420,
          ease: "Sine.InOut",
        });
      });
      this.s2s4Filtered = true;
      this.s2s4WriteConsole?.setTint(0x9ad0b4);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("F7", '=FILTER(TASK_QUEUE,ROLE="TEAM_LEADER") // 3 KEPT');
      this.setEditMode(false);
      return;
    }

    if (!this.s2s4SortPreviewed) {
      this.s2s4SortPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · DEPARTMENT_FIX → VACATION_APPROVAL → BUDGET_APPROVAL")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 2 · DEPARTMENT_FIX 최우선\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 2) return;

    this.calc -= 2;
    const sorted = [...this.s2s4QueueEntries].sort(
      (left, right) => left.priority - right.priority || left.originalIndex - right.originalIndex,
    );
    sorted.forEach((entry, index) => {
      this.tweens.add({
        targets: entry.container,
        x: 420 + index * 112,
        duration: 520,
        ease: "Sine.InOut",
      });
    });
    this.s2s4QueueEntries = sorted;
    this.s2s4Sorted = true;
    this.s2s4WriteConsole?.setTint(0x79d6a5);
    this.terminalChecked = true;
    useGameStore.getState().updateKeeper({ calc: this.calc, terminalChecked: true });
    useGameStore.getState().setSelectedCell("G7", "=SORT(TASK_QUEUE,PRIORITY,ASC) // DEPARTMENT_FIX #1");
    this.setEditMode(false);
    this.dispatchSession2Sheet4Leader();
  }

  private dispatchSession2Sheet4Leader() {
    if (this.s2s4Dispatched || !this.s2s4Leader) return;
    this.s2s4Dispatched = true;
    useGameStore.getState().setSelectedCell("M3", "=TEAM_LEADER.MOVE(P3) // DEPARTMENT_FIX");
    this.tweens.add({
      targets: this.s2s4Leader,
      x: 660,
      y: 214,
      duration: 1200,
      ease: "Sine.InOut",
      onComplete: () => {
        this.time.delayedCall(4000, () => this.completeSession2Sheet4Processing());
      },
    });
  }

  private completeSession2Sheet4Processing() {
    if (this.s2s4Processed) return;
    this.s2s4Processed = true;
    this.exitUnlocked = true;
    this.s2s4ProcessHighlight?.setTint(0x79d6a5);
    this.s2s4ViolationLabel
      ?.setText("POLICY_VIOLATIONS 2 · DEPARTMENT OPERATIONS")
      .setColor("#bfe6c4");
    this.s2s4Gate?.setTexture("office-ref-exitOpen");
    const gateBody = this.s2s4GateBody ? this.arcadeBody(this.s2s4GateBody) : undefined;
    if (gateBody) gateBody.enable = false;
    this.exitDoor?.setTexture("office-ref-exitOpen");
    useGameStore.getState().updateKeeper({ exitUnlocked: true });
    useGameStore.getState().setSelectedCell("P3", "=PROCESS(DEPARTMENT_FIX) // VIOLATIONS 7->2");
    if (this.s2s4Leader) {
      this.tweens.add({
        targets: this.s2s4Leader,
        x: this.s2s4LeaderHome.x,
        y: this.s2s4LeaderHome.y,
        duration: 1200,
        ease: "Sine.InOut",
      });
    }
  }

  private confirmSession2Final() {
    if (!this.editMode || this.s2fSubmitted || this.s2fSorted) return;
    if (!this.s2fFiltered) {
      if (!this.s2fFilterPreviewed) {
        this.s2fFilterPreviewed = true;
        this.inspectionLabel
          ?.setText("DROP · R5 OLD_GUEST (YESTERDAY) · KEEP 6")
          .setColor("#f2d875");
        this.executeLabel?.setText("ENTER 실행 · CALC 3 · 8초 안에 SORT+제출\nSPACE 편집 취소");
        return;
      }
      if (this.calc < 3) return;

      this.calc -= 3;
      this.s2fRows.forEach((row) => {
        if (row.date !== "TODAY") row.visible = false;
      });
      this.s2fFiltered = true;
      this.s2fSampleUntil = this.time.now + 8000;
      this.layoutAuditRows();
      this.s2fAuditStation?.setTint(0x9ad0b4);
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("M7", '=FILTER(AUDIT_ROWS,DATE="TODAY") // 8s WINDOW');
      this.setEditMode(false);
      return;
    }

    if (!this.s2fSortPreviewed) {
      this.s2fSortPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · COMPLIANT ×5 → PLAYER VIOLATION #6")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 2 · 표본 COUNTIF=0\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 2) return;

    this.calc -= 2;
    const order = new Map(this.s2fRows.map((row, index) => [row.id, index]));
    this.s2fRows.sort((left, right) => {
      const rank = (status: string) => (status === "COMPLIANT" ? 0 : 1);
      return rank(left.status) - rank(right.status)
        || (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0);
    });
    const visible = this.s2fRows.filter((row) => row.visible);
    const sample = visible.slice(0, 5);
    this.s2fSampleValid = sample.length >= 5
      && sample.every((row) => row.status === "COMPLIANT");
    this.s2fSorted = true;
    this.layoutAuditRows();
    this.s2fAuditStation?.setTint(this.s2fSampleValid ? 0x79d6a5 : 0xd97979);
    if (this.s2fSampleValid) {
      this.s2fVerdictLabel
        ?.setText("AUDIT_SAMPLE COMPLIANT · Q3 제출 대기")
        .setColor("#d8e6df");
    }
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell(
      "M7",
      this.s2fSampleValid
        ? "=SORT(AUDIT_ROWS,STATUS,ASC) // COUNTIF(SAMPLE,VIOLATION)=0"
        : "=SORT(AUDIT_ROWS,STATUS,ASC) // SAMPLE INVALID",
    );
    this.setEditMode(false);
  }

  private confirmSession3Sheet1If() {
    if (!this.editMode || this.s3s1IfInstalled) return;
    if (!this.s3s1IfPreviewed) {
      this.s3s1IfPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · EMPLOYEE_A @ F3 · CONDITION FALSE / WAITING")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 1 · 커피 호출로 조건 발동\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 1) return;

    this.calc -= 1;
    this.s3s1IfInstalled = true;
    this.s3s1InstallConsole?.setTint(0x79d6a5);
    this.s3s1StatusLabel?.setText("IF WAITING · CURRENT RESULT=FALSE").setColor("#f0c9a6");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell("H7", "=IF(EMPLOYEE_A.IN(G4),DOOR_K5.OPEN) // WAITING");
    this.setEditMode(false);
  }

  private confirmSession3Sheet2() {
    if (!this.editMode) return;
    if (!this.s3s2If1Installed) {
      if (!this.s3s2If1Previewed) {
        this.s3s2If1Previewed = true;
        this.inspectionLabel
          ?.setText("PREVIEW · PRINTER_F4=JAMMED · RESULT=TRUE / EXECUTE NOW")
          .setColor("#f2d875");
        this.executeLabel?.setText("ENTER 실행 · CALC 3 · 설치 즉시 H5 개방\nSPACE 편집 취소");
        return;
      }
      if (this.calc < 3) return;

      this.calc -= 3;
      this.s3s2If1Installed = true;
      this.s3s2ConsoleA?.setTint(0x79d6a5);
      this.s3s2Door1?.setTexture("office-ref-exitOpen");
      const door1Body = this.s3s2Door1Body ? this.arcadeBody(this.s3s2Door1Body) : undefined;
      if (door1Body) door1Body.enable = false;
      this.s3s2StatusLabel?.setText("IF#1 CONSUMED · H5 OPEN · IF#2 WAITING").setColor("#cfe7d2");
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("F7", '=IF(PRINTER_F4.STATUS="JAMMED",DOOR_H5.OPEN) // TRUE');
      this.setEditMode(false);
      return;
    }

    if (!this.s3s2If2Installed) {
      if (!this.s3s2If2Previewed) {
        this.s3s2If2Previewed = true;
        this.inspectionLabel
          ?.setText("PREVIEW · FACILITIES_A @ K3 · RESULT=FALSE / WAITING")
          .setColor("#f2d875");
        this.executeLabel?.setText("ENTER 실행 · CALC 3 · 수리 호출로 발동\nSPACE 편집 취소");
        return;
      }
      if (this.calc < 3) return;

      this.calc -= 3;
      this.s3s2If2Installed = true;
      this.s3s2ConsoleB?.setTint(0x79d6a5);
      this.s3s2StatusLabel?.setText("IF#2 INSTALLED · WAITING · J8 수리 호출 대기").setColor("#f0c9a6");
      useGameStore.getState().updateKeeper({ calc: this.calc });
      useGameStore.getState().setSelectedCell("L7", "=IF(FACILITIES_A.IN(L4),DOOR_N5.OPEN) // WAITING");
      this.setEditMode(false);
    }
  }

  private confirmSession3Sheet3If() {
    if (!this.editMode || this.s3s3IfInstalled) return;
    if (!this.s3s3IfPreviewed) {
      this.s3s3IfPreviewed = true;
      this.inspectionLabel
        ?.setText("PREVIEW · DOCUMENT @ F4 · RESULT=FALSE / WAITING")
        .setColor("#f2d875");
      this.executeLabel?.setText("ENTER 실행 · CALC 3 · 설치 시 컨베이어 시작\nSPACE 편집 취소");
      return;
    }
    if (this.calc < 3) return;

    this.calc -= 3;
    this.s3s3IfInstalled = true;
    this.s3s3ConveyorStarted = true;
    this.s3s3DocTimer = 0;
    this.s3s3IfConsole?.setTint(0x79d6a5);
    this.s3s3StatusLabel?.setText("IF WAITING · 컨베이어 시작 · DOCUMENT @ F4").setColor("#f0c9a6");
    useGameStore.getState().updateKeeper({ calc: this.calc });
    useGameStore.getState().setSelectedCell(
      "G7",
      "=IF(DOCUMENT.IN(J4),DOOR_L5.OPEN_FOR(3)) // WAITING · CONVEYOR ON",
    );
    this.setEditMode(false);
  }

  private executeHide(
    time: number,
    target: EditTarget,
    targets: HideTargetGroup[],
  ) {
    if (this.calc < 1 || this.hideUntil > time) return;
    this.calc -= 1;
    if (this.isSession1Sheet2()) {
      const targetFormula = this.targetFormula(target);
      if (targetFormula === "ROW_6") this.usedRow6 = true;
      if (targetFormula === "COLUMN_J") this.usedColumnJ = true;
    }
    this.hideUntil = time + HIDE_DURATION;
    this.activeHideTargets = targets;
    this.setEditMode(false);
    for (const group of targets) {
      for (const visual of group.visuals) visual.setVisible(false);
      for (const bodyObject of group.bodies) {
        const body = this.arcadeBody(bodyObject);
        if (body) {
          body.enable = false;
          if (body instanceof Phaser.Physics.Arcade.Body) {
            body.setVelocity(0);
          }
        }
      }
    }
    useGameStore.getState().updateKeeper({ calc: this.calc, hideActive: true, hideRemaining: 5 });
    useGameStore.getState().setSelectedCell(
      this.targetReference(target),
      `=HIDE(${this.targetFormula(target)}) // EXECUTED`,
    );
    this.updateFinalScoreDisplay();
  }

  private updateHide(time: number) {
    if (this.hideUntil <= 0) return;
    const remaining = Math.max(0, Math.ceil((this.hideUntil - time) / 1000));
    if (remaining !== this.lastHideSecond) {
      this.lastHideSecond = remaining;
      useGameStore.getState().updateKeeper({ hideRemaining: remaining });
    }
    if (time < this.hideUntil) return;
    this.hideUntil = 0;
    this.restoreActiveHideTargets();
  }

  private restoreActiveHideTargets() {
    for (const group of this.activeHideTargets) {
      for (const bodyObject of group.bodies) {
        const body = this.arcadeBody(bodyObject);
        if (!body) continue;
        this.movePlayerOutside(bodyObject);
        body.enable = true;
        if (body instanceof Phaser.Physics.Arcade.Body) {
          body.setVelocity(0);
          body.updateFromGameObject();
        }
      }
      for (const visual of group.visuals) visual.setVisible(true);
    }
    this.activeHideTargets = [];
    useGameStore.getState().updateKeeper({ hideActive: false, hideRemaining: 0 });
    this.updateFinalScoreDisplay();
  }

  private targetFormula(target: EditTarget) {
    if (target.kind === "column") {
      return `COLUMN_${String.fromCharCode(65 + target.index)}`;
    }
    return `ROW_${target.index + 1}`;
  }

  private targetReference(target: EditTarget) {
    if (target.kind === "column") {
      const column = String.fromCharCode(65 + target.index);
      return `${column}:${column}`;
    }
    const row = target.index + 1;
    return `${row}:${row}`;
  }

  private cellAt(x: number, y: number) {
    const column = String.fromCharCode(
      65 + Phaser.Math.Clamp(Math.floor(x / CELL_WIDTH), 0, WORLD_COLUMNS - 1),
    );
    const row = Phaser.Math.Clamp(Math.floor(y / CELL_HEIGHT) + 1, 1, WORLD_ROWS);
    return `${column}${row}`;
  }

  private targetsForSelection(target: EditTarget) {
    const targetKey = this.targetFormula(target);
    const selection = target.kind === "column"
      ? new Phaser.Geom.Rectangle(target.index * CELL_WIDTH, 0, CELL_WIDTH, WORLD_HEIGHT)
      : new Phaser.Geom.Rectangle(0, target.index * CELL_HEIGHT, WORLD_WIDTH, CELL_HEIGHT);
    return this.hideTargets.filter((group) => {
      if (group.targetKey) return group.targetKey === targetKey;
      return group.visuals.some((visual) =>
        Phaser.Geom.Intersects.RectangleToRectangle(selection, visual.getBounds()),
      );
    });
  }

  private registerHideTarget(
    visuals: HideVisual[],
    bodies: HideBodyObject[] = [],
    targetKey?: string,
  ) {
    this.hideTargets.push({ visuals, bodies, targetKey });
  }

  private addHideableFurniture(
    x: number,
    y: number,
    texture: string,
    displayWidth: number,
    displayHeight: number,
    colliderWidth: number,
    colliderHeight: number,
  ) {
    const image = this.add.image(x, y, texture)
      .setDisplaySize(displayWidth, displayHeight)
      .setDepth(3);
    const collider = this.addWall(x, y, colliderWidth, colliderHeight, 0);
    this.registerHideTarget([image], [collider]);
  }

  private movePlayerOutside(bodyObject: HideBodyObject) {
    if (!this.player || !this.arcadeBody(bodyObject)) return;
    const playerBounds = this.player.getBounds();
    const obstacle = bodyObject.getBounds();
    if (!Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, obstacle)) return;

    const candidates = [
      { x: obstacle.left - playerBounds.width / 2 - 4, y: this.player.y },
      { x: obstacle.right + playerBounds.width / 2 + 4, y: this.player.y },
      { x: this.player.x, y: obstacle.top - playerBounds.height / 2 - 4 },
      { x: this.player.x, y: obstacle.bottom + playerBounds.height / 2 + 4 },
    ];
    let nearest = { ...candidates[0], distance: Number.POSITIVE_INFINITY };
    for (const candidate of candidates) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        candidate.x,
        candidate.y,
      );
      if (distance < nearest.distance) nearest = { ...candidate, distance };
    }
    this.player.setPosition(
      Phaser.Math.Clamp(nearest.x, 20, WORLD_WIDTH - 20),
      Phaser.Math.Clamp(nearest.y, 20, WORLD_HEIGHT - 20),
    );
    (this.player.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
  }

  private arcadeBody(bodyObject: HideBodyObject) {
    return (bodyObject as Phaser.GameObjects.GameObject & {
      body?: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | null;
    }).body;
  }

  private addWall(
    x: number, y: number, width: number, height: number,
    alpha = 1,
  ) {
    const wall = this.add.rectangle(x, y, width, height, 0x29443e, alpha).setDepth(6);
    if (alpha > 0) wall.setStrokeStyle(2, 0x6e8b82, 0.9);
    this.physics.add.existing(wall, true);
    this.walls?.add(wall);
    return wall;
  }

  private createWalkAnimations() {
    for (const actor of ["player", "guard"] as const) {
      for (const direction of ["front", "back", "left", "right"] as const) {
        const key = `office-ref-${actor}-walk-${direction}`;
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: [
            { key: `office-ref-${actor}Walk${this.capitalize(direction)}1` },
            { key: `office-ref-${actor}Walk${this.capitalize(direction)}2` },
          ],
          frameRate: actor === "player" ? 7 : 6,
          repeat: -1,
        });
      }
    }
  }

  private stopWalker(
    sprite: Phaser.Physics.Arcade.Sprite,
    actor: "player" | "guard",
    direction: WalkDirection,
  ) {
    sprite.stop();
    sprite.setTexture(`office-ref-${actor}Walk${this.capitalize(direction)}1`);
  }

  private syncShadow(
    sprite: Phaser.GameObjects.Sprite,
    shadow?: Phaser.GameObjects.Ellipse,
  ) {
    shadow?.setPosition(sprite.x, sprite.y + sprite.displayHeight * 0.41);
  }

  private capitalize(value: WalkDirection) {
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}` as Capitalize<WalkDirection>;
  }

  private addPartition(
    x: number,
    y: number,
    width: number,
    height: number,
    targetKey?: string,
  ) {
    const horizontal = width >= height;
    const partition = this.add.image(x, y, "office-ref-partitionWall")
      .setDisplaySize(horizontal ? width : height, 22)
      .setDepth(7);
    if (!horizontal) partition.setAngle(90);
    const collider = this.addWall(x, y, width, height, 0);
    this.registerHideTarget([partition], [collider], targetKey);
    return { collider, partition };
  }

  private isSession1Sheet2() {
    return this.officeSheet.session === 1 && this.officeSheet.sheet === 2;
  }

  private isSession1Sheet3() {
    return this.officeSheet.session === 1 && this.officeSheet.sheet === 3;
  }

  private isSession1Sheet4() {
    return this.officeSheet.session === 1 && this.officeSheet.sheet === 4;
  }

  private isSession1Final() {
    return this.officeSheet.session === 1 && this.officeSheet.sheet === 5;
  }

  private isSession2Sheet1() {
    return this.officeSheet.session === 2 && this.officeSheet.sheet === 1;
  }

  private isSession2Sheet2() {
    return this.officeSheet.session === 2 && this.officeSheet.sheet === 2;
  }

  private isSession2Sheet3() {
    return this.officeSheet.session === 2 && this.officeSheet.sheet === 3;
  }

  private isSession2Sheet4() {
    return this.officeSheet.session === 2 && this.officeSheet.sheet === 4;
  }

  private isSession2Final() {
    return this.officeSheet.session === 2 && this.officeSheet.sheet === 5;
  }

  private isSession3Sheet1() {
    return this.officeSheet.session === 3 && this.officeSheet.sheet === 1;
  }

  private isSession3Sheet2() {
    return this.officeSheet.session === 3 && this.officeSheet.sheet === 2;
  }

  private isSession3Sheet3() {
    return this.officeSheet.session === 3 && this.officeSheet.sheet === 3;
  }

  private resizeCamera(width: number, height: number) {
    const zoom = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT);
    this.cameras.main.setZoom(zoom).centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  }

}
