// ProjectFerryEditorModule.cpp - Editor module: on startup, checks that the design data loads and
// reports the result in the Output Log, so the PO sees data errors before pressing Play.
// NOT YET BUILT IN UNREAL ENGINE.
#include "Data/FerryDesignData.h"
#include "Modules/ModuleManager.h"
#include "ProjectFerry.h"

class FProjectFerryEditorModule : public IModuleInterface
{
public:
	virtual void StartupModule() override
	{
		FFerryDesignDataLoadReport Report;
		const TSharedPtr<const FFerryDesignData> Data = FFerryDesignDataLoader::LoadFromDisk(Report);
		if (Data.IsValid() && Report.Errors.Num() == 0)
		{
			UE_LOG(LogFerry, Log, TEXT("[ProjectFerryEditor] design data OK from %s (%d warnings)"), *Report.DataDirectory,
				Report.Warnings.Num());
		}
		else
		{
			UE_LOG(LogFerry, Error, TEXT("[ProjectFerryEditor] design data FAILED from %s: %d errors (see LogFerry lines above)"),
				*Report.DataDirectory, Report.Errors.Num());
		}
	}

	virtual void ShutdownModule() override {}
};

IMPLEMENT_MODULE(FProjectFerryEditorModule, ProjectFerryEditor);
