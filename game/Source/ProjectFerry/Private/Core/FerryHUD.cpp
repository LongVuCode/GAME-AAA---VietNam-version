// FerryHUD.cpp - NOT YET BUILT IN UNREAL ENGINE ("chưa build trong UE").
#include "Core/FerryHUD.h"
#include "Core/FerryGameMode.h"
#include "Sample/FerrySampleQuestComponent.h"

#include "Combat/FerryCombatComponent.h"
#include "Combat/FerryKhoenComponent.h"
#include "Core/FerryCharacter.h"
#include "Data/FerryDataSubsystem.h"
#include "Enemy/FerryEnemy.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Engine/Font.h"
#include "Engine/World.h"
#include "EngineUtils.h"

namespace
{
const FLinearColor Back(0.0f, 0.0f, 0.0f, 0.55f);
const FLinearColor HealthColor(0.75f, 0.12f, 0.10f);
const FLinearColor PostureColor(0.95f, 0.75f, 0.20f);
const FLinearColor PostureBrokenColor(1.0f, 1.0f, 1.0f);
const FLinearColor DrumColor(0.85f, 0.45f, 0.15f);
const FLinearColor DrumFullColor(1.0f, 0.70f, 0.25f);
const FLinearColor CrackColor(0.85f, 0.30f, 0.10f);
const FLinearColor TextColor(0.95f, 0.93f, 0.88f);
constexpr float BossPanelRangeCm = 3000.0f; // boss bar shows while the boss is engaged and within 30 m
constexpr double ToastSeconds = 3.0;
// VERIFY: the engine default fonts (Roboto) must render Vietnamese diacritics (ặ, ữ, ỹ); see BUILD_GUIDE_UE §7.
UFont* SmallFont() { return GEngine != nullptr ? GEngine->GetMediumFont() : nullptr; }
UFont* BigFont() { return GEngine != nullptr ? GEngine->GetLargeFont() : nullptr; }
} // namespace

void AFerryHUD::DrawBar(float X, float Y, float W, float H, float Ratio, const FLinearColor& Fill)
{
	DrawRect(Back, X, Y, W, H);
	DrawRect(Fill, X + 2.0f, Y + 2.0f, (W - 4.0f) * FMath::Clamp(Ratio, 0.0f, 1.0f), H - 4.0f);
}

void AFerryHUD::DrawLabel(const FText& Text, float X, float Y, const FLinearColor& Color, bool bLarge, bool bCentered)
{
	UFont* Font = bLarge ? BigFont() : SmallFont();
	const FString String = Text.ToString();
	float W = 0.0f;
	float H = 0.0f;
	GetTextSize(String, W, H, Font, UiScale);
	DrawText(String, Color, bCentered ? X - W * 0.5f : X, Y, Font, UiScale);
}

void AFerryHUD::DrawWrappedLabel(const FText& Text, float CenterX, float Y)
{
	if (Text.IsEmpty()) return;
	TArray<FString> Words;
	Text.ToString().ParseIntoArrayWS(Words);
	TArray<FString> Lines;
	FString Line;
	const float MaxWidth = Canvas->ClipX * 0.8f;
	float Width = 0.0f, Height = 0.0f;
	GetTextSize(TEXT("Ag"), Width, Height, SmallFont(), UiScale);
	const float LineHeight = FMath::Max(Height, 14.0f * UiScale) + 5.0f * UiScale;
	TArray<FString> Paragraphs;
	Text.ToString().ParseIntoArray(Paragraphs, TEXT("\n"), false);
	for (const FString& Paragraph : Paragraphs)
	{
		Words.Reset();
		Paragraph.ParseIntoArrayWS(Words);
		Line.Reset();
		for (const FString& Word : Words)
		{
			const FString Candidate = Line.IsEmpty() ? Word : Line + TEXT(" ") + Word;
			GetTextSize(Candidate, Width, Height, SmallFont(), UiScale);
			if (Width > MaxWidth && !Line.IsEmpty()) { Lines.Add(Line); Line = Word; }
			else Line = Candidate;
		}
		Lines.Add(Line); // Preserve explicit paragraph breaks in the journal.
	}
	DrawRect(FLinearColor(0.015f, 0.02f, 0.025f, 0.8f), CenterX - MaxWidth * 0.5f - 8.0f,
		Y - 4.0f, MaxWidth + 16.0f, Lines.Num() * LineHeight + 8.0f);
	for (int32 Index = 0; Index < Lines.Num(); ++Index)
		DrawLabel(FText::FromString(Lines[Index]), CenterX, Y + Index * LineHeight, TextColor, false, true);
}

void AFerryHUD::DrawHUD()
{
	Super::DrawHUD();
	if (Canvas == nullptr)
	{
		return;
	}
	UiScale = FMath::Max(Canvas->ClipY / 1080.0f, 0.5f);
	const AFerryCharacter* Player = Cast<AFerryCharacter>(GetOwningPawn());
	const UFerryDataSubsystem* Strings = UFerryDataSubsystem::Get(this);
	if (Player == nullptr || Strings == nullptr || Player->GetCombat() == nullptr || !Player->GetCombat()->IsReady())
	{
		return;
	}
	DrawPlayerPanel(*Player, *Strings);
	if (const AFerryGameMode* Mode = GetWorld()->GetAuthGameMode<AFerryGameMode>())
	{
		const UFerrySampleQuestComponent* Quest = Mode->GetSampleQuest();
		if (Quest && Quest->IsActive())
		{
			if (Quest->IsJournalOpen())
			{
				DrawRect(FLinearColor(0.005f, 0.008f, 0.012f, 0.88f), 0, 0, Canvas->ClipX, Canvas->ClipY);
				DrawWrappedLabel(Quest->GetJournalText(), Canvas->ClipX * 0.5f, Canvas->ClipY * 0.15f);
				return; // No combat/subtitle panels may cover the reading surface.
			}
			DrawLabel(Quest->GetJournalToggleHint(), Canvas->ClipX * 0.5f, Canvas->ClipY * 0.91f, TextColor, false, true);
			DrawWrappedLabel(Quest->GetObjective(), Canvas->ClipX * 0.5f, Canvas->ClipY * 0.07f);
			DrawLabel(Quest->GetHint(Player), Canvas->ClipX * 0.5f, Canvas->ClipY * 0.82f, TextColor, false, true);
			DrawWrappedLabel(Quest->GetSubtitle(), Canvas->ClipX * 0.5f, Canvas->ClipY * 0.18f);
		}
	}

	if (const AFerryEnemy* Boss = FindEngagedBoss(*Player))
	{
		DrawTargetPanel(*Boss);
	}
	else if (const AFerryEnemy* Target = Player->GetLockOnTarget())
	{
		DrawTargetPanel(*Target);
	}
	if (const AFerryEnemy* Target = Player->GetLockOnTarget())
	{
		const FVector Screen = Project(Target->GetActorLocation(), false);
		if (Screen.Z > 0.0f)
		{
			DrawRect(TextColor, Screen.X - 5.0f * UiScale, Screen.Y - 5.0f * UiScale, 10.0f * UiScale, 10.0f * UiScale);
		}
	}
	DrawPry(*Player, *Strings);

	const double Now = GetWorld()->GetTimeSeconds();
	if (Now - Player->GetInteractToastTime() < ToastSeconds)
	{
		DrawLabel(Player->GetInteractToast(), Canvas->ClipX * 0.5f, Canvas->ClipY * 0.72f, TextColor, false, true);
	}
	if (Player->GetCombat()->IsDead())
	{
		DrawLabel(Strings->GetUiText(FName(TEXT("you_fell"))), Canvas->ClipX * 0.5f, Canvas->ClipY * 0.4f, HealthColor, true, true);
	}
}

void AFerryHUD::DrawPlayerPanel(const AFerryCharacter& Player, const UFerryDataSubsystem& Strings)
{
	const UFerryCombatComponent& Combat = *Player.GetCombat();
	const float X = 40.0f * UiScale;
	float Y = Canvas->ClipY - 190.0f * UiScale;
	const float W = 360.0f * UiScale;
	const float H = 16.0f * UiScale;
	const float Gap = 44.0f * UiScale;

	DrawLabel(Strings.GetUiText(FName(TEXT("hud_health"))), X, Y - 22.0f * UiScale, TextColor);
	DrawBar(X, Y, W, H, Combat.GetHealth() / FMath::Max(Combat.GetMaxHealth(), 1.0f), HealthColor);
	Y += Gap;
	DrawLabel(Strings.GetUiText(FName(TEXT("hud_the"))), X, Y - 22.0f * UiScale, TextColor);
	DrawBar(X, Y, W, H, Combat.GetPostureRatio(), Combat.IsPostureBroken() ? PostureBrokenColor : PostureColor);
	Y += Gap;

	const int32 Notches = FMath::Max(Combat.GetDrumNotchCount(), 1);
	const float PerNotch = FMath::Max(Combat.GetDrumPointsPerNotch(), 1.0f);
	const float SegmentGap = 6.0f * UiScale;
	const float SegmentW = (W - SegmentGap * static_cast<float>(Notches - 1)) / static_cast<float>(Notches);
	DrawLabel(Combat.CanDrumSurge() ? Strings.GetUiText(FName(TEXT("hud_drum_ready"))) : Strings.GetUiText(FName(TEXT("hud_drum"))),
		X, Y - 22.0f * UiScale, Combat.CanDrumSurge() ? DrumFullColor : TextColor);
	for (int32 Index = 0; Index < Notches; ++Index)
	{
		const float Fill = (Combat.GetDrumPoints() - PerNotch * static_cast<float>(Index)) / PerNotch;
		DrawBar(X + (SegmentW + SegmentGap) * static_cast<float>(Index), Y, SegmentW, H, Fill,
			Index < Combat.GetDrumFullNotches() ? DrumFullColor : DrumColor);
	}
}

AFerryEnemy* AFerryHUD::FindEngagedBoss(const AFerryCharacter& Player) const
{
	for (TActorIterator<AFerryEnemy> It(GetWorld()); It; ++It)
	{
		AFerryEnemy* Enemy = *It;
		if (Enemy->IsBoss() && Enemy->IsTargetable() && Enemy->GetState() != EFerryEnemyState::Idle
			&& FVector::Dist(Enemy->GetActorLocation(), Player.GetActorLocation()) <= BossPanelRangeCm)
		{
			return Enemy;
		}
	}
	return nullptr;
}

void AFerryHUD::DrawTargetPanel(const AFerryEnemy& Target)
{
	const float W = 600.0f * UiScale;
	const float X = (Canvas->ClipX - W) * 0.5f;
	float Y = 60.0f * UiScale;
	if (const AFerryGameMode* Mode = GetWorld()->GetAuthGameMode<AFerryGameMode>())
	{
		if (Mode->GetSampleQuest() && Mode->GetSampleQuest()->IsActive()) Y = Canvas->ClipY * 0.32f;
	}
	DrawLabel(Target.GetDisplayName(), Canvas->ClipX * 0.5f, Y - 30.0f * UiScale, TextColor, false, true);
	DrawBar(X, Y, W, 14.0f * UiScale, Target.GetHealthRatio(), HealthColor);
	Y += 20.0f * UiScale;
	DrawBar(X, Y, W, 10.0f * UiScale, Target.GetPostureRatio(), Target.GetState() == EFerryEnemyState::Staggered ? PostureBrokenColor : PostureColor);

	// Shackle: crack marks on the shackle itself (visual state of the object, not a shard counter - V9).
	const UFerryKhoenComponent* Khoen = Target.IsBoss() ? Target.GetKhoen() : nullptr;
	if (Khoen != nullptr && Khoen->IsShackleEnabled())
	{
		const int32 Stages = FMath::Max(Khoen->GetCracksToOpen(), 1);
		const float Size = 12.0f * UiScale;
		const float StartX = Canvas->ClipX * 0.5f - (Size * 1.8f * static_cast<float>(Stages)) * 0.5f;
		for (int32 Index = 0; Index < Stages; ++Index)
		{
			const bool bCracked = Index < Khoen->GetCracks();
			DrawRect(bCracked ? CrackColor : Back, StartX + Size * 1.8f * static_cast<float>(Index), Y + 18.0f * UiScale, Size, Size);
		}
	}
}

void AFerryHUD::DrawPry(const AFerryCharacter& Player, const UFerryDataSubsystem& Strings)
{
	const float CenterX = Canvas->ClipX * 0.5f;
	const float CenterY = Canvas->ClipY * 0.62f;
	const AFerryEnemy* Boss = Player.GetPryTarget();
	if (Boss == nullptr)
	{
		if (const AFerryEnemy* Candidate = Player.FindPryCandidate())
		{
			const bool bPry = Candidate->GetKhoen()->CanBeginPry();
			// K0 shove has no string in strings.json yet: the "#key" marker makes the gap visible.
			DrawLabel(Strings.GetUiText(bPry ? FName(TEXT("prompt_pry")) : FName(TEXT("prompt_finisher_shove"))),
				CenterX, CenterY, DrumFullColor, true, true);
		}
		return;
	}
	const UFerryKhoenComponent* Khoen = Boss->GetKhoen();
	if (Khoen == nullptr || !Khoen->IsPrying())
	{
		return;
	}
	// Rhythm bar centred on the next beat slot: [target - interval, target + interval].
	const float Interval = FMath::Max(Khoen->GetBeatInterval(), 0.05f);
	const float Target = Khoen->GetCurrentBeatTime();
	const float W = 420.0f * UiScale;
	const float H = 14.0f * UiScale;
	const float X = CenterX - W * 0.5f;
	const float PixelsPerSecond = W / (2.0f * Interval);
	DrawRect(Back, X, CenterY, W, H);
	const float WindowW = 2.0f * Khoen->GetBeatHalfWindow() * PixelsPerSecond;
	DrawRect(DrumColor, CenterX - WindowW * 0.5f, CenterY, WindowW, H);
	const float CursorX = CenterX + (Khoen->GetPryElapsed() - Target) * PixelsPerSecond;
	if (CursorX >= X && CursorX <= X + W)
	{
		DrawRect(TextColor, CursorX - 2.0f * UiScale, CenterY - 4.0f * UiScale, 4.0f * UiScale, H + 8.0f * UiScale);
	}
	const int32 Beats = FMath::Max(Khoen->GetPryBeats(), 1);
	const float Pip = 14.0f * UiScale;
	for (int32 Index = 0; Index < Beats; ++Index)
	{
		DrawRect(Index < Khoen->GetBeatsHit() ? DrumFullColor : Back,
			CenterX - Pip * 1.5f * static_cast<float>(Beats) * 0.5f + Pip * 1.5f * static_cast<float>(Index), CenterY + H + 10.0f * UiScale, Pip, Pip);
	}
	DrawLabel(Strings.GetUiText(FName(TEXT("prompt_pry"))), CenterX, CenterY - 36.0f * UiScale, DrumFullColor, false, true);
}
