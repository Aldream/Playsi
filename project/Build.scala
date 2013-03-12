import sbt._
import play.Project._

object ApplicationBuild extends Build {

  val appName         = "aedi"
  val appVersion      = "1.0-beta"

  val appDependencies = Seq(
    // Add your project dependencies here,
    javaCore,
    javaJdbc,
    javaEbean
  )

  val main = play.Project(appName, appVersion, appDependencies).settings(
    // Add your own project settings here      
  )

}
