import * as Phaser from "phaser";
import { useGameStore } from "@/stores/gameStore";

const WORLD_WIDTH = 1500;
const WORLD_HEIGHT = 900;
const BOSS_KILL_TARGET = 12;
const BOSS_MAX_HP = 42;
const ASSET_ROOT = "/assets/pixel-art/office-defence";
const PLAYER_PROJECTILE_SPEED = 620;
const PLAYER_PROJECTILE_LIFETIME = 1550;
const HOSTILE_PROJECTILE_LIFETIME = 2800;

type ArcadeCollisionObject = Parameters<
  Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
>[0];

interface MovementKeys {
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
}

interface EnemyDefinition {
  hp: number;
  key: string;
  scale: number;
  speed: number;
  weight: number;
  xp: number;
}

const ENEMY_DEFINITIONS: EnemyDefinition[] = [
  {
    key: "zombie-employee-front",
    hp: 1,
    speed: 64,
    scale: 0.31,
    weight: 34,
    xp: 18,
  },
  {
    key: "zombie-manager-front",
    hp: 3,
    speed: 52,
    scale: 0.31,
    weight: 19,
    xp: 25,
  },
  {
    key: "paper-monster",
    hp: 1,
    speed: 92,
    scale: 0.27,
    weight: 18,
    xp: 14,
  },
  {
    key: "monitor-monster",
    hp: 2,
    speed: 58,
    scale: 0.27,
    weight: 13,
    xp: 23,
  },
  {
    key: "folder-monster",
    hp: 2,
    speed: 72,
    scale: 0.26,
    weight: 10,
    xp: 21,
  },
  {
    key: "printer-monster",
    hp: 4,
    speed: 42,
    scale: 0.25,
    weight: 6,
    xp: 34,
  },
];

const OFFICE_PROPS = [
  { key: "office-workstation", x: 145, y: 150, scale: 0.48 },
  { key: "copier-printer-prop", x: 510, y: 112, scale: 0.4 },
  { key: "filing-cabinets", x: 1328, y: 145, scale: 0.4 },
  { key: "water-cooler", x: 1390, y: 690, scale: 0.38 },
  { key: "potted-plant", x: 1120, y: 92, scale: 0.34 },
  { key: "bookshelf", x: 132, y: 770, scale: 0.4 },
  { key: "office-desk", x: 1070, y: 780, scale: 0.43 },
  { key: "office-workstation", x: 560, y: 805, scale: 0.38 },
  { key: "potted-plant", x: 310, y: 770, scale: 0.29 },
] as const;

export class CellOfficeDefenceScene extends Phaser.Scene {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private movementKeys?: MovementKeys;
  private player?: Phaser.Physics.Arcade.Sprite;
  private enemies?: Phaser.Physics.Arcade.Group;
  private projectiles?: Phaser.Physics.Arcade.Group;
  private hostileProjectiles?: Phaser.Physics.Arcade.Group;
  private pickups?: Phaser.Physics.Arcade.Group;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private statusLabel?: Phaser.GameObjects.Text;
  private boss?: Phaser.Physics.Arcade.Sprite;
  private lastAttackAt = 0;
  private lastBossAttackAt = 0;
  private lastContactAt = -1000;
  private lastClockSecond = -1;
  private bossSpawned = false;
  private enemySequence = 0;
  private shotSequence = 0;
  private runStartedAt = 0;
  private runStatus: "playing" | "won" | "lost" = "playing";

  constructor() {
    super("cell-office-defence");
  }

  preload() {
    const characters = `${ASSET_ROOT}/characters`;
    const items = `${ASSET_ROOT}/weapons-ui`;
    const environment = `${ASSET_ROOT}/environment`;

    this.load.image("defence-player-front", `${characters}/player_front.png`);
    this.load.image("defence-player-back", `${characters}/player_back.png`);
    this.load.image("defence-player-left", `${characters}/player_left.png`);
    this.load.image("defence-player-right", `${characters}/player_right.png`);
    this.load.image(
      "zombie-employee-front",
      `${characters}/zombie_employee_front.png`,
    );
    this.load.image(
      "zombie-employee-back",
      `${characters}/zombie_employee_back.png`,
    );
    this.load.image(
      "zombie-employee-left",
      `${characters}/zombie_employee_left.png`,
    );
    this.load.image(
      "zombie-employee-right",
      `${characters}/zombie_employee_right.png`,
    );
    this.load.image(
      "zombie-manager-front",
      `${characters}/zombie_manager_front.png`,
    );
    this.load.image(
      "zombie-manager-back",
      `${characters}/zombie_manager_back.png`,
    );
    this.load.image(
      "zombie-manager-left",
      `${characters}/zombie_manager_left.png`,
    );
    this.load.image(
      "zombie-manager-right",
      `${characters}/zombie_manager_right.png`,
    );
    this.load.image("paper-monster", `${characters}/paper_monster.png`);
    this.load.image("monitor-monster", `${characters}/monitor_monster.png`);
    this.load.image("folder-monster", `${characters}/folder_monster.png`);
    this.load.image("printer-monster", `${characters}/printer_monster.png`);

    this.load.image("paperclip-projectile", `${items}/paperclip_projectile.png`);
    this.load.image("xp-gem-small", `${items}/xp_gem_small.png`);
    this.load.image("xp-gem-medium", `${items}/xp_gem_medium.png`);
    this.load.image("xp-gem-large", `${items}/xp_gem_large.png`);

    this.load.image("boss-front", `${environment}/boss_front.png`);
    this.load.image("boss-back", `${environment}/boss_back.png`);
    this.load.image("boss-left", `${environment}/boss_left.png`);
    this.load.image("boss-right", `${environment}/boss_right.png`);
    this.load.image(
      "office-workstation",
      `${environment}/office_workstation.png`,
    );
    this.load.image(
      "copier-printer-prop",
      `${environment}/copier_printer.png`,
    );
    this.load.image("filing-cabinets", `${environment}/filing_cabinets.png`);
    this.load.image("water-cooler", `${environment}/water_cooler.png`);
    this.load.image("potted-plant", `${environment}/potted_plant.png`);
    this.load.image("bookshelf", `${environment}/bookshelf.png`);
    this.load.image("office-desk", `${environment}/office_desk.png`);
    this.load.image("floor-tile", `${environment}/floor_tile.png`);
    this.load.image(
      "boss-fist-projectile",
      `${environment}/boss_fist_projectile.png`,
    );
    this.load.image("paperclip-swoosh", `${environment}/paperclip_swoosh.png`);
    this.load.image("hit-explosion", `${environment}/hit_explosion.png`);
    this.load.image(
      "alert-exclamation",
      `${environment}/alert_exclamation.png`,
    );
  }

  create() {
    this.enemySequence = 0;
    this.shotSequence = 0;
    this.lastAttackAt = 0;
    this.lastBossAttackAt = 0;
    this.lastContactAt = -1000;
    this.lastClockSecond = -1;
    this.bossSpawned = false;
    this.boss = undefined;
    this.runStatus = "playing";

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.createArena();
    this.addOfficeProps();

    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group({ maxSize: 80 });
    this.hostileProjectiles = this.physics.add.group({ maxSize: 20 });
    this.pickups = this.physics.add.group({ maxSize: 80 });

    this.player = this.physics.add
      .sprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, "defence-player-front")
      .setScale(0.32)
      .setCollideWorldBounds(true)
      .setDepth(2000);
    this.setCompactBody(this.player, 0.48, 0.42, 0.28);

    this.physics.add.overlap(
      this.projectiles,
      this.enemies,
      this.hitEnemy,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handleEnemyContact,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.hostileProjectiles,
      this.handleHostileProjectile,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.pickups,
      this.collectExperience,
      undefined,
      this,
    );

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.movementKeys = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys | undefined;

    this.spawnTimer = this.time.addEvent({
      delay: 1120,
      loop: true,
      callback: this.spawnEnemy,
      callbackScope: this,
    });

    this.statusLabel = this.add
      .text(18, 18, "AUTO ATTACK ONLINE", {
        backgroundColor: "#0d3c50e8",
        color: "#ecfbff",
        fontFamily: '"Courier New", monospace',
        fontSize: "13px",
        padding: { x: 12, y: 8 },
        stroke: "#071a22",
        strokeThickness: 2,
      })
      .setScrollFactor(0)
      .setDepth(4000);

    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setZoom(1);
    this.runStartedAt = this.time.now;

    const initial = useGameStore.getState();
    initial.updateDefence({
      bossHp: 0,
      experience: 0,
      hp: initial.defenceMaxHp,
      kills: 0,
      level: 1,
      status: "playing",
      timeSurvived: 0,
      upgradePending: false,
    });

    for (let index = 0; index < 2; index += 1) {
      this.time.delayedCall(500 + index * 300, () => this.spawnEnemy());
    }
  }

  update() {
    if (
      !this.player ||
      !this.enemies ||
      !this.cursors ||
      !this.movementKeys ||
      this.runStatus !== "playing"
    ) {
      return;
    }

    const state = useGameStore.getState();
    if (state.defenceUpgradePending) {
      this.physics.pause();
      return;
    }
    if (this.physics.world.isPaused) {
      this.physics.resume();
    }

    const velocity = new Phaser.Math.Vector2(
      Number(this.cursors.right.isDown || this.movementKeys.right.isDown) -
        Number(this.cursors.left.isDown || this.movementKeys.left.isDown),
      Number(this.cursors.down.isDown || this.movementKeys.down.isDown) -
        Number(this.cursors.up.isDown || this.movementKeys.up.isDown),
    );

    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(state.defenceMoveSpeed);
    }

    this.player.setVelocity(velocity.x, velocity.y);
    this.updateDirectionalTexture(this.player, "defence-player", velocity);
    this.player.setDepth(this.player.y + 1200);
    this.updateProjectileLifetimes();

    for (const child of this.enemies.getChildren()) {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active || enemy === this.boss) {
        continue;
      }
      const speed = Number(enemy.getData("speed") ?? 72);
      this.physics.moveToObject(enemy, this.player, speed);
      this.updateEnemyTexture(enemy);
      enemy.setDepth(enemy.y + 1000);
    }

    if (this.boss?.active) {
      const bossSpeed = Number(this.boss.getData("speed") ?? 42);
      this.physics.moveToObject(this.boss, this.player, bossSpeed);
      this.updateDirectionalTexture(
        this.boss,
        "boss",
        new Phaser.Math.Vector2(
          this.boss.body?.velocity.x ?? 0,
          this.boss.body?.velocity.y ?? 0,
        ),
      );
      this.boss.setDepth(this.boss.y + 1050);

      if (this.time.now - this.lastBossAttackAt >= 1350) {
        this.lastBossAttackAt = this.time.now;
        this.fireBossProjectile();
      }
    }

    if (this.time.now - this.lastAttackAt >= state.defenceAttackDelay) {
      this.lastAttackAt = this.time.now;
      this.fireAtNearestEnemies();
    }

    if (state.defenceKills >= BOSS_KILL_TARGET && !this.bossSpawned) {
      this.spawnBoss();
    }

    const elapsedSeconds = Math.max(
      0,
      Math.floor((this.time.now - this.runStartedAt) / 1000),
    );
    if (elapsedSeconds !== this.lastClockSecond) {
      this.lastClockSecond = elapsedSeconds;
      state.updateDefence({ timeSurvived: elapsedSeconds });
    }

    this.statusLabel?.setText(
      this.bossSpawned
        ? `BOSS ACTIVE  ·  HP ${state.defenceBossHp}/${BOSS_MAX_HP}`
        : `AUTO ATTACK  ·  ${Math.max(0, BOSS_KILL_TARGET - state.defenceKills)} KILLS TO BOSS`,
    );
  }

  private createArena() {
    const floor = this.add.graphics().setDepth(0);
    floor.fillStyle(0xdcecf4);
    floor.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    for (let x = 0; x < WORLD_WIDTH; x += 42) {
      for (let y = 0; y < WORLD_HEIGHT; y += 42) {
        floor.fillStyle((x / 42 + y / 42) % 2 === 0 ? 0xe6f2f8 : 0xd9eaf3);
        floor.fillRect(x + 1, y + 1, 40, 40);
      }
    }

    const border = this.add.graphics().setDepth(2);
    border.lineStyle(5, 0x6e8996, 0.72);
    border.strokeRect(5, 5, WORLD_WIDTH - 10, WORLD_HEIGHT - 10);
    border.lineStyle(1, 0x6f92a3, 0.22);
    for (let x = 42; x < WORLD_WIDTH; x += 42) {
      border.lineBetween(x, 0, x, WORLD_HEIGHT);
    }
    for (let y = 42; y < WORLD_HEIGHT; y += 42) {
      border.lineBetween(0, y, WORLD_WIDTH, y);
    }
  }

  private addOfficeProps() {
    for (const prop of OFFICE_PROPS) {
      this.add
        .image(prop.x, prop.y, prop.key)
        .setScale(prop.scale)
        .setDepth(prop.y + 100);
    }
  }

  private spawnEnemy() {
    if (
      !this.enemies ||
      !this.player ||
      this.runStatus !== "playing" ||
      this.enemies.countActive(true) >= 26
    ) {
      return;
    }

    const position = this.randomEdgePosition();
    const definition = this.pickEnemyDefinition();
    const difficulty = 1 + Math.min(0.8, useGameStore.getState().defenceLevel * 0.07);
    const enemy = this.enemies
      .create(position.x, position.y, definition.key)
      .setScale(definition.scale)
      .setData("hp", Math.ceil(definition.hp * difficulty))
      .setData("enemyId", ++this.enemySequence)
      .setData("speed", definition.speed + difficulty * 5)
      .setData("xp", definition.xp)
      .setData("baseKey", definition.key.replace("-front", ""))
      .setDepth(position.y + 1000) as Phaser.Physics.Arcade.Sprite;

    this.setCompactBody(enemy, 0.52, 0.46, 0.26);
  }

  private spawnBoss() {
    if (!this.enemies || !this.player) {
      return;
    }

    this.bossSpawned = true;
    const position = this.randomEdgePosition();
    this.boss = this.enemies
      .create(position.x, position.y, "boss-front")
      .setScale(0.48)
      .setData("hp", BOSS_MAX_HP)
      .setData("enemyId", ++this.enemySequence)
      .setData("speed", 46)
      .setData("xp", 0)
      .setData("boss", true)
      .setDepth(position.y + 1050) as Phaser.Physics.Arcade.Sprite;
    this.setCompactBody(this.boss, 0.64, 0.58, 0.2);
    useGameStore.getState().updateDefence({ bossHp: BOSS_MAX_HP });

    const warning = this.add
      .image(this.player.x, this.player.y - 105, "alert-exclamation")
      .setScale(0.25)
      .setDepth(3500);
    this.tweens.add({
      targets: warning,
      y: warning.y - 20,
      alpha: 0,
      duration: 900,
      ease: "Cubic.Out",
      onComplete: () => warning.destroy(),
    });
    this.cameras.main.flash(360, 235, 45, 45);
    this.cameras.main.shake(320, 0.007);
  }

  private fireAtNearestEnemies() {
    if (!this.player || !this.enemies || !this.projectiles) {
      return;
    }

    const targets = this.enemies
      .getChildren()
      .map((child) => child as Phaser.Physics.Arcade.Sprite)
      .filter((enemy) => enemy.active)
      .sort(
        (first, second) =>
          Phaser.Math.Distance.Squared(
            this.player!.x,
            this.player!.y,
            first.x,
            first.y,
          ) -
          Phaser.Math.Distance.Squared(
            this.player!.x,
            this.player!.y,
            second.x,
            second.y,
          ),
      );

    if (targets.length === 0) {
      return;
    }

    const state = useGameStore.getState();
    const shotCount = Math.min(
      5,
      1 + Math.floor((state.defenceLevel - 1) / 2),
    );
    const singleTargetVolley = targets.length === 1 && shotCount > 1;

    for (let index = 0; index < shotCount; index += 1) {
      const target = targets[index % targets.length];
      const baseAngle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        target.x,
        target.y,
      );
      const spread = singleTargetVolley
        ? (index - (shotCount - 1) / 2) * Phaser.Math.DegToRad(7)
        : 0;
      const angle = baseAngle + spread;
      const spawnX = this.player.x + Math.cos(angle) * 28;
      const spawnY = this.player.y + Math.sin(angle) * 28;
      const projectile = this.activatePooledSprite(
        this.projectiles,
        spawnX,
        spawnY,
        "paperclip-projectile",
      );
      if (!projectile) {
        continue;
      }

      projectile
        .setScale(0.22)
        .setRotation(angle)
        .setAngularVelocity(index % 2 === 0 ? 760 : -760);
      projectile.setDepth(2700);
      this.setCompactBody(projectile, 0.74, 0.54, 0.14);
      projectile.setVelocity(
        Math.cos(angle) * PLAYER_PROJECTILE_SPEED,
        Math.sin(angle) * PLAYER_PROJECTILE_SPEED,
      );
      projectile.setData({
        damage: state.defenceDamage,
        expiresAt: this.time.now + PLAYER_PROJECTILE_LIFETIME,
        hitTargets: new Set<number>(),
        pierceRemaining: state.defenceLevel >= 6 ? 2 : 1,
        shotId: ++this.shotSequence,
      });
      this.showMuzzleEffect(spawnX, spawnY, angle);
    }
  }

  private fireBossProjectile() {
    if (!this.boss?.active || !this.player || !this.hostileProjectiles) {
      return;
    }

    const fist = this.activatePooledSprite(
      this.hostileProjectiles,
      this.boss.x,
      this.boss.y,
      "boss-fist-projectile",
    );
    if (!fist) {
      return;
    }

    const angle = Phaser.Math.Angle.Between(
      this.boss.x,
      this.boss.y,
      this.player.x,
      this.player.y,
    );
    fist
      .setScale(0.22)
      .setRotation(angle)
      .setAngularVelocity(220)
      .setDepth(2800)
      .setData("expiresAt", this.time.now + HOSTILE_PROJECTILE_LIFETIME);
    this.setCompactBody(fist, 0.64, 0.58, 0.2);
    this.physics.moveToObject(fist, this.player, 245);
  }

  private hitEnemy(
    projectileObject: ArcadeCollisionObject,
    enemyObject: ArcadeCollisionObject,
  ) {
    const projectile = projectileObject as Phaser.Physics.Arcade.Sprite;
    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
    if (!projectile.active || !enemy.active) {
      return;
    }

    const enemyId = Number(enemy.getData("enemyId") ?? 0);
    const hitTargets = projectile.getData("hitTargets") as
      | Set<number>
      | undefined;
    if (hitTargets?.has(enemyId)) {
      return;
    }
    hitTargets?.add(enemyId);

    const pierceRemaining =
      Number(projectile.getData("pierceRemaining") ?? 1) - 1;
    projectile.setData("pierceRemaining", pierceRemaining);
    if (pierceRemaining <= 0) {
      this.deactivateProjectile(projectile);
    }

    this.showHitEffect(enemy.x, enemy.y);
    const damage = Number(
      projectile.getData("damage") ?? useGameStore.getState().defenceDamage,
    );
    const hp = Number(enemy.getData("hp") ?? 1) - damage;
    enemy.setData("hp", hp);
    enemy.setTint(0xffffff);
    this.time.delayedCall(75, () => {
      if (enemy.active) {
        enemy.clearTint();
      }
    });

    if (enemy.getData("boss")) {
      useGameStore.getState().updateDefence({ bossHp: Math.max(0, hp) });
    }
    if (hp > 0) {
      return;
    }

    const wasBoss = Boolean(enemy.getData("boss"));
    const xp = Number(enemy.getData("xp") ?? 18);
    const dropX = enemy.x;
    const dropY = enemy.y;
    enemy.disableBody(true, true);

    if (wasBoss) {
      this.boss = undefined;
      this.finishRun("won");
      return;
    }

    const state = useGameStore.getState();
    state.updateDefence({ kills: state.defenceKills + 1 });
    this.dropExperience(dropX, dropY, xp);
  }

  private collectExperience(
    _playerObject: ArcadeCollisionObject,
    pickupObject: ArcadeCollisionObject,
  ) {
    const pickup = pickupObject as Phaser.Physics.Arcade.Sprite;
    if (!pickup.active) {
      return;
    }

    const value = Number(pickup.getData("value") ?? 18);
    this.tweens.killTweensOf(pickup);
    pickup.disableBody(true, true);
    const state = useGameStore.getState();
    let experience = state.defenceExperience + value;
    let level = state.defenceLevel;
    let upgradePending = false;

    while (experience >= 100) {
      experience -= 100;
      level += 1;
      upgradePending = true;
    }

    state.updateDefence({ experience, level, upgradePending });
  }

  private handleEnemyContact(
    _playerObject: ArcadeCollisionObject,
    enemyObject: ArcadeCollisionObject,
  ) {
    if (this.time.now - this.lastContactAt < 680) {
      return;
    }

    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
    this.damagePlayer(enemy.getData("boss") ? 14 : 5);
    enemy.setVelocity(
      Phaser.Math.Between(-230, 230),
      Phaser.Math.Between(-230, 230),
    );
  }

  private handleHostileProjectile(
    _playerObject: ArcadeCollisionObject,
    projectileObject: ArcadeCollisionObject,
  ) {
    const projectile = projectileObject as Phaser.Physics.Arcade.Sprite;
    if (!projectile.active) {
      return;
    }
    this.deactivateProjectile(projectile);
    this.damagePlayer(13);
  }

  private damagePlayer(amount: number) {
    if (this.time.now - this.lastContactAt < 880) {
      return;
    }

    this.lastContactAt = this.time.now;
    const state = useGameStore.getState();
    const nextHp = Math.max(0, state.defenceHp - amount);
    state.updateDefence({ hp: nextHp });
    this.player?.setTint(0xff8787);
    this.time.delayedCall(120, () => this.player?.clearTint());
    this.cameras.main.shake(120, 0.006);

    if (nextHp <= 0) {
      this.finishRun("lost");
    }
  }

  private dropExperience(x: number, y: number, value: number) {
    if (!this.pickups) {
      return;
    }

    const key =
      value >= 30 ? "xp-gem-large" : value >= 21 ? "xp-gem-medium" : "xp-gem-small";
    const pickup = this.activatePooledSprite(
      this.pickups,
      x + Phaser.Math.Between(-12, 12),
      y + Phaser.Math.Between(-12, 12),
      key,
    );
    if (!pickup) {
      return;
    }

    this.tweens.killTweensOf(pickup);
    pickup
      .setScale(value >= 30 ? 0.2 : value >= 21 ? 0.18 : 0.16)
      .setData("value", value)
      .setDepth(850);
    this.setCompactBody(pickup, 0.58, 0.58, 0.2);
    this.tweens.add({
      targets: pickup,
      y: pickup.y - 7,
      duration: 480,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  private activatePooledSprite(
    group: Phaser.Physics.Arcade.Group,
    x: number,
    y: number,
    texture: string,
  ) {
    const sprite = group.get(
      x,
      y,
      texture,
    ) as Phaser.Physics.Arcade.Sprite | null;
    if (!sprite) {
      return undefined;
    }

    sprite.enableBody(true, x, y, true, true);
    sprite
      .setTexture(texture)
      .setPosition(x, y)
      .setAlpha(1)
      .setAngle(0)
      .setVelocity(0, 0)
      .setAngularVelocity(0)
      .clearTint();
    return sprite;
  }

  private deactivateProjectile(projectile: Phaser.Physics.Arcade.Sprite) {
    projectile.setVelocity(0, 0).setAngularVelocity(0);
    projectile.disableBody(true, true);
  }

  private updateProjectileLifetimes() {
    const now = this.time.now;
    for (const group of [this.projectiles, this.hostileProjectiles]) {
      if (!group) {
        continue;
      }
      for (const child of group.getChildren()) {
        const projectile = child as Phaser.Physics.Arcade.Sprite;
        if (
          projectile.active &&
          Number(projectile.getData("expiresAt") ?? Number.POSITIVE_INFINITY) <=
            now
        ) {
          this.deactivateProjectile(projectile);
        }
      }
    }
  }

  private showMuzzleEffect(x: number, y: number, angle: number) {
    const swoosh = this.add
      .image(x, y, "paperclip-swoosh")
      .setRotation(angle)
      .setScale(0.12)
      .setAlpha(0.86)
      .setDepth(2650);
    this.tweens.add({
      targets: swoosh,
      x: x + Math.cos(angle) * 20,
      y: y + Math.sin(angle) * 20,
      scale: 0.2,
      alpha: 0,
      duration: 125,
      ease: "Cubic.Out",
      onComplete: () => swoosh.destroy(),
    });
  }

  private showHitEffect(x: number, y: number) {
    const effect = this.add
      .image(x, y, "hit-explosion")
      .setScale(0.14)
      .setDepth(3100);
    this.tweens.add({
      targets: effect,
      scale: 0.25,
      alpha: 0,
      duration: 170,
      ease: "Cubic.Out",
      onComplete: () => effect.destroy(),
    });
  }

  private updateEnemyTexture(enemy: Phaser.Physics.Arcade.Sprite) {
    const baseKey = String(enemy.getData("baseKey") ?? "");
    if (!baseKey.startsWith("zombie-")) {
      return;
    }
    this.updateDirectionalTexture(
      enemy,
      baseKey,
      new Phaser.Math.Vector2(
        enemy.body?.velocity.x ?? 0,
        enemy.body?.velocity.y ?? 0,
      ),
    );
  }

  private updateDirectionalTexture(
    sprite: Phaser.Physics.Arcade.Sprite,
    baseKey: string,
    velocity: Phaser.Math.Vector2,
  ) {
    if (velocity.lengthSq() < 0.1) {
      return;
    }

    let direction = "front";
    if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
      direction = velocity.x < 0 ? "left" : "right";
    } else {
      direction = velocity.y < 0 ? "back" : "front";
    }
    const key = `${baseKey}-${direction}`;
    if (this.textures.exists(key) && sprite.texture.key !== key) {
      sprite.setTexture(key);
    }
  }

  private setCompactBody(
    sprite: Phaser.Physics.Arcade.Sprite,
    widthRatio: number,
    heightRatio: number,
    topRatio: number,
  ) {
    const width = sprite.width * widthRatio;
    const height = sprite.height * heightRatio;
    sprite.body
      ?.setSize(width, height)
      .setOffset((sprite.width - width) / 2, sprite.height * topRatio);
  }

  private randomEdgePosition() {
    const margin = 38;
    const edge = Phaser.Math.Between(0, 3);
    const positions = [
      { x: Phaser.Math.Between(margin, WORLD_WIDTH - margin), y: margin },
      {
        x: WORLD_WIDTH - margin,
        y: Phaser.Math.Between(margin, WORLD_HEIGHT - margin),
      },
      {
        x: Phaser.Math.Between(margin, WORLD_WIDTH - margin),
        y: WORLD_HEIGHT - margin,
      },
      { x: margin, y: Phaser.Math.Between(margin, WORLD_HEIGHT - margin) },
    ];
    return positions[edge];
  }

  private pickEnemyDefinition() {
    const totalWeight = ENEMY_DEFINITIONS.reduce(
      (sum, definition) => sum + definition.weight,
      0,
    );
    let roll = Phaser.Math.Between(1, totalWeight);
    for (const definition of ENEMY_DEFINITIONS) {
      roll -= definition.weight;
      if (roll <= 0) {
        return definition;
      }
    }
    return ENEMY_DEFINITIONS[0];
  }

  private finishRun(status: "won" | "lost") {
    if (this.runStatus !== "playing") {
      return;
    }

    this.runStatus = status;
    this.spawnTimer?.remove(false);
    this.physics.pause();
    useGameStore.getState().updateDefence({ status });
  }
}
